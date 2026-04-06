"""FastAPI backend for LLM Council."""

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from fastapi_sso.sso.google import GoogleSSO
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
import json
import asyncio
from fastapi import FastAPI, HTTPException, Request, Depends

from . import storage
from .config import (
    GOOGLE_CLIENT_ID, 
    GOOGLE_CLIENT_SECRET, 
    SECRET_KEY, 
    ADMIN_EMAIL, 
    IS_PUBLIC_SERVER,
    is_localhost,
    APP_DOMAIN,
    APP_ENV,
    ALLOW_LOCAL_AUTH_BYPASS,
    OPENROUTER_API_KEY
)
from .council import (
    run_full_council,
    generate_conversation_title,
    stage1_collect_responses,
    stage2_collect_rankings,
    stage3_synthesize_final,
    calculate_aggregate_rankings,
    sum_token_usage,
)
from .llm_provider import list_models, get_credits, get_quota

app = FastAPI(title="LLM Council API")

# Google SSO initialization - only if configured
sso = None
if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    sso = GoogleSSO(
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        allow_insecure_http=True, # We handle SSL via Cloudflare/Caddy
        scope=["openid", "email", "profile"]
    )

# Enable Sessions for OAuth
app.add_middleware(
    SessionMiddleware, 
    secret_key=SECRET_KEY,
    https_only=IS_PUBLIC_SERVER, # Enforce HTTPS cookies in production
    same_site="lax"
)

# Enable CORS for local development and production domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174", 
        "http://localhost:5173", 
        "http://localhost:3000", 
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5173",
        f"https://{APP_DOMAIN}", 
        "https://llm-board.ll.rs" # Keep for compatibility if needed
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_current_user(request: Request) -> Dict[str, Any]:
    """
    Dependency to check for authentication and authorization.
    STRICT MODE: No bypass allowed.
    """
    host = request.headers.get("host", "")
    session_user = request.session.get("user")
    
    # URGENT DEBUG LOGGING
    print(f"--- SECURITY CHECK ---")
    print(f"HOST: {host}")
    print(f"APP_ENV: {APP_ENV}")
    print(f"ALLOW_LOCAL_BYPASS: {ALLOW_LOCAL_AUTH_BYPASS}")
    print(f"HAS_SESSION: {session_user is not None}")
    print(f"----------------------")
    
    if not session_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Authorization: Only allow ADMIN_EMAIL
    if session_user.get("email") != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail=f"Access denied: {session_user.get('email')} is not authorized")
    
    return session_user


class CreateConversationRequest(BaseModel):
    """Request to create a new conversation."""
    pass


class SendMessageRequest(BaseModel):
    """Request to send a message in a conversation."""
    content: str
    provider: str | None = None
    models: List[str] | None = None
    chairman_model: str | None = None


class ConversationMetadata(BaseModel):
    """Conversation metadata for list view."""
    id: str
    created_at: str
    title: str
    message_count: int


class Conversation(BaseModel):
    """Full conversation with all messages."""
    id: str
    created_at: str
    title: str
    messages: List[Dict[str, Any]]


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "LLM Council API"}


# --- Authentication Endpoints ---

def get_redirect_uri(request: Request) -> str:
    """Consistently determine the redirect URI for OAuth."""
    # Force production URI if in production mode
    if APP_ENV == "production":
        return f"https://{APP_DOMAIN}/api/auth/callback"
        
    # Local development fallback
    host = request.headers.get("host", "")
    return f"http://{host}/api/auth/callback"


@app.get("/api/auth/login")
async def login(request: Request):
    """Start Google OAuth flow."""
    if not sso:
        raise HTTPException(
            status_code=500, 
            detail="Google SSO not configured. Cannot perform OAuth login."
        )

    redirect_uri = get_redirect_uri(request)
    return await sso.get_login_redirect(redirect_uri=redirect_uri)


@app.get("/api/auth/callback")
async def login_callback(request: Request):
    """Handle Google OAuth callback."""
    if not sso:
        raise HTTPException(status_code=500, detail="Google SSO not configured")
        
    redirect_uri = get_redirect_uri(request)
    user = await sso.verify_and_process(request, redirect_uri=redirect_uri)
    if not user:
        raise HTTPException(status_code=401, detail="Google authentication failed")
    
    # Strict check: Only majkic@gmail.com!
    if user.email != ADMIN_EMAIL:
        # Redirect to frontend with error param instead of raising 403
        # This allows the React app to show a nice UI
        from urllib.parse import urlencode
        error_params = urlencode({"error": "unauthorized", "email": user.email})
        
        # Determine base redirect URL
        host = request.headers.get("host", "")
        if is_localhost(host):
            return RedirectResponse(url=f"http://localhost:5173/?{error_params}")
        
        return RedirectResponse(url=f"/?{error_params}")
        
    # Store user in session
    request.session["user"] = {
        "email": user.email,
        "name": user.display_name,
        "picture": user.picture
    }
    
    # Redirect back to frontend
    # If on localhost, go to 5173. If production, stay on current domain.
    host = request.headers.get("host", "")
    if is_localhost(host):
        return RedirectResponse(url="http://localhost:5173")
    
    return RedirectResponse(url="/")


@app.get("/api/auth/logout")
async def logout(request: Request):
    """Clear user session."""
    request.session.pop("user", None)
    return {"status": "logged_out"}


@app.get("/api/auth/me")
async def get_me(user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    """Return current user info."""
    return user


# --- Application Endpoints ---

@app.get("/api/usage/stats")
async def get_usage_stats(user: Dict[str, Any] = Depends(get_current_user)):
    """Get OpenRouter credits."""
    openrouter_stats = await get_credits()
    print(f"DEBUG get_usage_stats (openrouter_stats): {openrouter_stats}")
    return {
        "openrouter": openrouter_stats.get("balance")
    }


@app.get("/api/models")
async def get_available_models(provider: str | None = None, user: Dict[str, Any] = Depends(get_current_user)):
    """List all available models for a provider."""
    return await list_models(provider)


@app.get("/api/conversations", response_model=List[ConversationMetadata])
async def list_conversations(user: Dict[str, Any] = Depends(get_current_user)):
    """List all conversations (metadata only)."""
    return storage.list_conversations()


@app.post("/api/conversations", response_model=Conversation)
async def create_conversation(request: CreateConversationRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Create a new conversation."""
    conversation_id = str(uuid.uuid4())
    conversation = storage.create_conversation(conversation_id)
    return conversation


@app.get("/api/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Get a specific conversation with all its messages."""
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.post("/api/conversations/{conversation_id}/message")
async def send_message(conversation_id: str, request: SendMessageRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Send a message and run the 3-stage council process.
    Returns the complete response with all stages.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    # Add user message
    storage.add_user_message(conversation_id, request.content)

    # If this is the first message, generate a title
    if is_first_message:
        title = await generate_conversation_title(request.content)
        storage.update_conversation_title(conversation_id, title)

    # Run the 3-stage council process
    stage1_results, stage2_results, stage3_result, metadata = await run_full_council(
        request.content,
        models=request.models,
        chairman_model=request.chairman_model,
        provider=request.provider
    )

    # Add assistant message with all stages
    storage.add_assistant_message(
        conversation_id,
        stage1_results,
        stage2_results,
        stage3_result,
        metadata=metadata
    )

    # Return the complete response with metadata
    return {
        "stage1": stage1_results,
        "stage2": stage2_results,
        "stage3": stage3_result,
        "metadata": metadata
    }


@app.post("/api/conversations/{conversation_id}/message/stream")
async def send_message_stream(conversation_id: str, request: SendMessageRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Send a message and stream the 3-stage council process.
    Returns Server-Sent Events as each stage completes.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    async def event_generator():
        try:
            # Add user message
            storage.add_user_message(conversation_id, request.content)

            # Start title generation in parallel (don't await yet)
            title_task = None
            if is_first_message:
                title_task = asyncio.create_task(generate_conversation_title(request.content))

            # Stage 1: Collect responses
            yield f"data: {json.dumps({'type': 'stage1_start'})}\n\n"
            stage1_results, stage1_usage = await stage1_collect_responses(
                request.content, models=request.models, provider=request.provider
            )
            yield f"data: {json.dumps({'type': 'stage1_complete', 'data': stage1_results, 'usage': stage1_usage})}\n\n"

            # Stage 2: Collect rankings
            yield f"data: {json.dumps({'type': 'stage2_start'})}\n\n"
            stage2_results, label_to_model, stage2_usage = await stage2_collect_rankings(
                request.content, stage1_results, models=request.models, provider=request.provider
            )
            aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
            yield f"data: {json.dumps({'type': 'stage2_complete', 'data': stage2_results, 'usage': stage2_usage, 'metadata': {'label_to_model': label_to_model, 'aggregate_rankings': aggregate_rankings}})}\n\n"

            # Stage 3: Synthesize final answer
            yield f"data: {json.dumps({'type': 'stage3_start'})}\n\n"
            stage3_result, stage3_usage = await stage3_synthesize_final(
                request.content, 
                stage1_results, 
                stage2_results, 
                chairman_model=request.chairman_model, 
                provider=request.provider
            )
            yield f"data: {json.dumps({'type': 'stage3_complete', 'data': stage3_result, 'usage': stage3_usage})}\n\n"

            # Wait for title generation if it was started
            if title_task:
                title = await title_task
                storage.update_conversation_title(conversation_id, title)
                yield f"data: {json.dumps({'type': 'title_complete', 'data': {'title': title}})}\n\n"

            # Aggregate usage
            total_usage = sum_token_usage([stage1_usage, stage2_usage, stage3_usage])
            
            metadata = {
                "label_to_model": label_to_model,
                "aggregate_rankings": aggregate_rankings,
                "usage": {
                    "stage1": stage1_usage,
                    "stage2": stage2_usage,
                    "stage3": stage3_usage,
                    "total": total_usage
                }
            }

            # Save complete assistant message
            storage.add_assistant_message(
                conversation_id,
                stage1_results,
                stage2_results,
                stage3_result,
                metadata=metadata
            )

            # Send completion event
            yield f"data: {json.dumps({'type': 'complete', 'metadata': metadata})}\n\n"

        except Exception as e:
            import traceback
            traceback.print_exc()
            # Send error event
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
