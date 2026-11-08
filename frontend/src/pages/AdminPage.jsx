import React, { useState, useEffect } from 'react';
import { api } from '../api';
import './AdminPage.css';

const AdminPage = ({ onBack }) => {
    const [abacusEnabled, setAbacusEnabled] = useState(true);
    const [openrouterEnabled, setOpenrouterEnabled] = useState(true);
    const [abacusModels, setAbacusModels] = useState([]);
    const [openrouterModels, setOpenrouterModels] = useState([]);
    const [availableAbacusModels, setAvailableAbacusModels] = useState([]);
    const [availableOpenrouterModels, setAvailableOpenrouterModels] = useState([]);
    const [customAbacusModel, setCustomAbacusModel] = useState('');
    const [customOpenrouterModel, setCustomOpenrouterModel] = useState('');
    const [status, setStatus] = useState('');
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const settings = await api.getAdminSettings();
                setAbacusEnabled(settings.abacus_enabled);
                setOpenrouterEnabled(settings.openrouter_enabled);
                setAbacusModels(settings.abacus_models || []);
                setOpenrouterModels(settings.openrouter_models || []);

                const abacusList = await api.listModels('abacus');
                setAvailableAbacusModels(abacusList);
                const openrouterList = await api.listModels('openrouter');
                setAvailableOpenrouterModels(openrouterList);
            } catch (error) {
                console.error('Error fetching data:', error);
                setStatus('Error fetching data.');
                setIsError(true);
            }
        };
        fetchData();
    }, []);

    const persistSettings = async (updates) => {
        const settings = {
            abacus_enabled: abacusEnabled,
            openrouter_enabled: openrouterEnabled,
            abacus_models: abacusModels,
            openrouter_models: openrouterModels,
            ...updates
        };
        try {
            await api.updateAdminSettings(settings);
            setStatus('Settings saved automatically');
            setIsError(false);
            setTimeout(() => setStatus(''), 2000);
        } catch (error) {
            console.error('Error updating settings:', error);
            setStatus('Error saving settings: ' + error.message);
            setIsError(true);
        }
    };

    const handleAddModel = (e, provider) => {
        e.preventDefault();
        const modelId = provider === 'abacus' ? customAbacusModel : customOpenrouterModel;
        if (!modelId.trim()) return;

        if (provider === 'abacus') {
            if (!abacusModels.includes(modelId.trim())) {
                const newModels = [...abacusModels, modelId.trim()];
                setAbacusModels(newModels);
                persistSettings({ abacus_models: newModels });
            }
            setCustomAbacusModel('');
        } else {
            if (!openrouterModels.includes(modelId.trim())) {
                const newModels = [...openrouterModels, modelId.trim()];
                setOpenrouterModels(newModels);
                persistSettings({ openrouter_models: newModels });
            }
            setCustomOpenrouterModel('');
        }
    };

    const removeModel = (provider, modelId) => {
        if (provider === 'abacus') {
            const newModels = abacusModels.filter(m => m !== modelId);
            setAbacusModels(newModels);
            persistSettings({ abacus_models: newModels });
        } else {
            const newModels = openrouterModels.filter(m => m !== modelId);
            setOpenrouterModels(newModels);
            persistSettings({ openrouter_models: newModels });
        }
    };

    const toggleProvider = (provider, enabled) => {
        if (provider === 'abacus') {
            setAbacusEnabled(enabled);
            persistSettings({ abacus_enabled: enabled });
        } else {
            setOpenrouterEnabled(enabled);
            persistSettings({ openrouter_enabled: enabled });
        }
    };

    return (
        <div className="admin-container">
            <header className="admin-header">
                <button onClick={onBack} className="back-btn">&larr; Back to Chat</button>
                <h1>Admin Settings</h1>
            </header>

            <div className="admin-form">
                <section className="provider-section">
                    <div className="provider-header">
                        <input
                            type="checkbox"
                            id="abacusEnabled"
                            checked={abacusEnabled}
                            onChange={(e) => toggleProvider('abacus', e.target.checked)}
                        />
                        <label htmlFor="abacusEnabled">AbacusAI</label>
                    </div>
                    <div className="model-input-group">
                        <label>Preselected Models</label>
                        <div className="model-tags">
                            {abacusModels.map(model => (
                                <div key={model} className="model-tag">
                                    {model}
                                    <button onClick={() => removeModel('abacus', model)} title="Remove">&times;</button>
                                </div>
                            ))}
                        </div>
                        <form className="custom-model-form-admin" onSubmit={(e) => handleAddModel(e, 'abacus')}>
                            <input
                                type="text"
                                list="available-abacus-models"
                                placeholder="Add model ID..."
                                value={customAbacusModel}
                                onChange={(e) => setCustomAbacusModel(e.target.value)}
                                disabled={!abacusEnabled}
                                className="admin-model-input"
                            />
                            <datalist id="available-abacus-models">
                                {availableAbacusModels.map(m => (
                                    <option key={m} value={m} />
                                ))}
                            </datalist>
                            <button type="submit" disabled={!abacusEnabled || !customAbacusModel.trim()}>+</button>
                        </form>
                    </div>
                </section>

                <section className="provider-section">
                    <div className="provider-header">
                        <input
                            type="checkbox"
                            id="openrouterEnabled"
                            checked={openrouterEnabled}
                            onChange={(e) => toggleProvider('openrouter', e.target.checked)}
                        />
                        <label htmlFor="openrouterEnabled">Openrouter</label>
                    </div>
                    <div className="model-input-group">
                        <label>Preselected Models</label>
                        <div className="model-tags">
                            {openrouterModels.map(model => (
                                <div key={model} className="model-tag">
                                    {model}
                                    <button onClick={() => removeModel('openrouter', model)} title="Remove">&times;</button>
                                </div>
                            ))}
                        </div>
                        <form className="custom-model-form-admin" onSubmit={(e) => handleAddModel(e, 'openrouter')}>
                            <input
                                type="text"
                                list="available-openrouter-models"
                                placeholder="Add model ID..."
                                value={customOpenrouterModel}
                                onChange={(e) => setCustomOpenrouterModel(e.target.value)}
                                disabled={!openrouterEnabled}
                                className="admin-model-input"
                            />
                            <datalist id="available-openrouter-models">
                                {availableOpenrouterModels.map(m => (
                                    <option key={m} value={m} />
                                ))}
                            </datalist>
                            <button type="submit" disabled={!openrouterEnabled || !customOpenrouterModel.trim()}>+</button>
                        </form>
                    </div>
                </section>
            </div>

            {status && (
                <div className={`admin-status ${isError ? 'status-error' : 'status-success'}`}>
                    {status}
                </div>
            )}
        </div>
    );
};

export default AdminPage;
