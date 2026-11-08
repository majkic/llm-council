import os
import json
from typing import List

SETTINGS_FILE = "admin_settings.json"

class AdminSettings:
    def __init__(self):
        self._settings = self._load_settings()

    def _load_settings(self):
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r') as f:
                return json.load(f)
        return {
            "abacus_enabled": True,
            "openrouter_enabled": True,
            "abacus_models": [],
            "openrouter_models": []
        }

    def save_settings(self):
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(self._settings, f, indent=4)

    def get_settings(self):
        return self._settings.copy()

    def update_settings(self, abacus_enabled: bool, openrouter_enabled: bool, abacus_models: List[str], openrouter_models: List[str]):
        if not abacus_enabled and not openrouter_enabled:
            raise ValueError("At least one provider must be enabled.")

        self._settings["abacus_enabled"] = abacus_enabled
        self._settings["openrouter_enabled"] = openrouter_enabled
        self._settings["abacus_models"] = abacus_models
        self._settings["openrouter_models"] = openrouter_models
        self.save_settings()

admin_settings = AdminSettings()
