import { useState } from 'react';
import './AdminSettings.css';

const PROVIDERS = ['abacus', 'openrouter'];

export default function AdminSettings({ settings, onClose, onSave }) {
  const [models, setModels] = useState(settings.models);
  const [chairmanModel, setChairmanModel] = useState(settings.chairman_model);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const updateModels = (provider, value) => {
    setModels({
      ...models,
      [provider]: value.split('\n').map((model) => model.trim()).filter(Boolean),
    });
  };

  const save = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      await onSave({ models, chairman_model: chairmanModel.trim() });
    } catch (saveError) {
      setError(saveError.message);
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="admin-dialog" onSubmit={save} onMouseDown={(event) => event.stopPropagation()}>
        <div className="admin-dialog-header">
          <h2>Admin Settings</h2>
          <button type="button" className="dialog-close" aria-label="Close settings" onClick={onClose}>x</button>
        </div>
        {PROVIDERS.map((provider) => (
          <label className="admin-field" key={provider}>
            <span>{provider === 'abacus' ? 'Abacus models' : 'OpenRouter models'}</span>
            <textarea value={(models[provider] || []).join('\n')} onChange={(event) => updateModels(provider, event.target.value)} rows="5" />
          </label>
        ))}
        <label className="admin-field">
          <span>Default chairman model</span>
          <input value={chairmanModel} onChange={(event) => setChairmanModel(event.target.value)} required />
        </label>
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save settings'}</button>
        </div>
      </form>
    </div>
  );
}