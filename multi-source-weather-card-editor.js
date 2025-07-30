// Multi-Source Weather Consensus Card Editor
class MultiSourceWeatherCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._activeTab = 'config';
    this.config = {};
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  setConfig(config) {
    this.config = {
      type: 'custom:multi-source-weather-card',
      title: 'Weather Consensus',
      card_mode: 'default',
      sources: [],
      display: {
        background: 'gradient',
        border_radius: 8,
        show_source_breakdown: false,
        show_forecast: true
      },
      consensus: {
        confidence_threshold: 75
      },
      ...config
    };

    // Auto-detect sources if none configured
    if (this.config.sources.length === 0) {
      this._autoDetectSources();
    }

    this._render();
  }

  _autoDetectSources() {
    if (!this._hass) return;

    const weatherEntities = Object.keys(this._hass.states)
      .filter(entityId => entityId.startsWith('weather.'))
      .slice(0, 4)
      .map((entityId, index) => {
        const weights = [35, 30, 25, 10];
        return {
          entity: entityId,
          weight: weights[index] || 20,
          enabled: true
        };
      });

    if (weatherEntities.length > 0) {
      this.config.sources = weatherEntities;
      this._fireConfigChanged();
    }
  }

  _fireConfigChanged() {
    const event = new CustomEvent('config-changed', {
      detail: { config: this.config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  _switchTab(tab) {
    this._activeTab = tab;
    this._render();
  }

  _updateConfig(key, value) {
    this.config[key] = value;
    this._fireConfigChanged();
    this._render();
  }

  _updateDisplayConfig(key, value) {
    this.config.display = { ...this.config.display, [key]: value };
    this._fireConfigChanged();
    this._render();
  }

  _updateConsensusConfig(key, value) {
    this.config.consensus = { ...this.config.consensus, [key]: value };
    this._fireConfigChanged();
    this._render();
  }

  _updateSource(index, key, value) {
    const sources = [...this.config.sources];
    sources[index] = { ...sources[index], [key]: value };
    this.config.sources = sources;
    this._fireConfigChanged();
    this._render();
  }

  _removeSource(index) {
    const sources = [...this.config.sources];
    sources.splice(index, 1);
    this.config.sources = sources;
    this._fireConfigChanged();
    this._render();
  }

  _addSource() {
    if (!this._hass) return;

    const availableEntities = Object.keys(this._hass.states)
      .filter(entityId => entityId.startsWith('weather.'))
      .filter(entityId => !this.config.sources.find(s => s.entity === entityId));

    if (availableEntities.length === 0) return;

    this.config.sources = [
      ...this.config.sources,
      {
        entity: availableEntities[0],
        weight: 20,
        enabled: true
      }
    ];
    this._fireConfigChanged();
    this._render();
  }

  _getAvailableEntities() {
    if (!this._hass) return [];
    
    return Object.keys(this._hass.states)
      .filter(entityId => entityId.startsWith('weather.'))
      .map(entityId => ({
        value: entityId,
        label: this._hass.states[entityId].attributes.friendly_name || entityId
      }));
  }

  _setupEventListeners() {
    // Set up event listeners after render
    setTimeout(() => {
      // Tab switching
      this.shadowRoot.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
          this._switchTab(e.target.dataset.tab);
        });
      });

      // Form inputs
      const titleInput = this.shadowRoot.querySelector('#title');
      if (titleInput) {
        titleInput.addEventListener('input', (e) => {
          this._updateConfig('title', e.target.value);
        });
      }

      const cardModeSelect = this.shadowRoot.querySelector('#card_mode');
      if (cardModeSelect) {
        cardModeSelect.addEventListener('change', (e) => {
          this._updateConfig('card_mode', e.target.value);
        });
      }

      // Display options
      const showBreakdownCheckbox = this.shadowRoot.querySelector('#show_breakdown');
      if (showBreakdownCheckbox) {
        showBreakdownCheckbox.addEventListener('change', (e) => {
          this._updateDisplayConfig('show_source_breakdown', e.target.checked);
        });
      }

      const showForecastCheckbox = this.shadowRoot.querySelector('#show_forecast');
      if (showForecastCheckbox) {
        showForecastCheckbox.addEventListener('change', (e) => {
          this._updateDisplayConfig('show_forecast', e.target.checked);
        });
      }

      // Background style
      const backgroundSelect = this.shadowRoot.querySelector('#background');
      if (backgroundSelect) {
        backgroundSelect.addEventListener('change', (e) => {
          this._updateDisplayConfig('background', e.target.value);
        });
      }

      // Border radius
      const borderRadiusSlider = this.shadowRoot.querySelector('#border_radius');
      if (borderRadiusSlider) {
        borderRadiusSlider.addEventListener('input', (e) => {
          this._updateDisplayConfig('border_radius', parseInt(e.target.value));
        });
      }

      // Confidence threshold
      const confidenceSlider = this.shadowRoot.querySelector('#confidence_threshold');
      if (confidenceSlider) {
        confidenceSlider.addEventListener('input', (e) => {
          this._updateConsensusConfig('confidence_threshold', parseInt(e.target.value));
        });
      }

      // Source controls
      this.config.sources.forEach((source, index) => {
        const enabledCheckbox = this.shadowRoot.querySelector(`#source_enabled_${index}`);
        if (enabledCheckbox) {
          enabledCheckbox.addEventListener('change', (e) => {
            this._updateSource(index, 'enabled', e.target.checked);
          });
        }

        const weightSlider = this.shadowRoot.querySelector(`#source_weight_${index}`);
        if (weightSlider) {
          weightSlider.addEventListener('input', (e) => {
            this._updateSource(index, 'weight', parseInt(e.target.value));
          });
        }

        const entitySelect = this.shadowRoot.querySelector(`#source_entity_${index}`);
        if (entitySelect) {
          entitySelect.addEventListener('change', (e) => {
            this._updateSource(index, 'entity', e.target.value);
          });
        }

        const removeButton = this.shadowRoot.querySelector(`#remove_source_${index}`);
        if (removeButton) {
          removeButton.addEventListener('click', () => {
            this._removeSource(index);
          });
        }
      });

      // Add source button
      const addButton = this.shadowRoot.querySelector('#add_source');
      if (addButton) {
        addButton.addEventListener('click', () => {
          this._addSource();
        });
      }
    }, 10);
  }

  _render() {
    if (!this._hass) {
      this.shadowRoot.innerHTML = '<div style="padding: 20px;">Loading...</div>';
      return;
    }

    const availableEntities = this._getAvailableEntities();

    // Config tab content
    const configTabContent = this._activeTab === 'config' ? `
      <div class="tab-content">
        <div class="section">
          <h3>Basic Settings</h3>
          
          <div class="field">
            <label for="title">Card Title</label>
            <input type="text" id="title" value="${this.config.title || ''}" />
          </div>

          <div class="field">
            <label for="card_mode">Card Mode</label>
            <select id="card_mode">
              <option value="default" ${this.config.card_mode === 'default' ? 'selected' : ''}>Default</option>
              <option value="compact" ${this.config.card_mode === 'compact' ? 'selected' : ''}>Compact</option>
              <option value="detailed" ${this.config.card_mode === 'detailed' ? 'selected' : ''}>Detailed</option>
            </select>
          </div>
        </div>

        <div class="section">
          <h3>Weather Sources</h3>
          
          ${this.config.sources.map((source, index) => `
            <div class="source-config">
              <div class="source-header">
                <h4>${this._hass.states[source.entity]?.attributes.friendly_name || source.entity}</h4>
                <button type="button" id="remove_source_${index}" class="remove-btn">Remove</button>
              </div>

              <div class="field">
                <label for="source_entity_${index}">Entity</label>
                <select id="source_entity_${index}">
                  ${availableEntities.map(entity => `
                    <option value="${entity.value}" ${entity.value === source.entity ? 'selected' : ''}>
                      ${entity.label}
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="field">
                <label>
                  <input type="checkbox" id="source_enabled_${index}" ${source.enabled ? 'checked' : ''} />
                  Enabled
                </label>
              </div>

              <div class="field">
                <label for="source_weight_${index}">Weight: ${source.weight}%</label>
                <input type="range" id="source_weight_${index}" min="0" max="100" value="${source.weight}" />
              </div>
            </div>
          `).join('')}

          <button type="button" id="add_source" class="add-btn">Add Weather Source</button>
        </div>

        <div class="section">
          <h3>Consensus Settings</h3>
          
          <div class="field">
            <label for="confidence_threshold">Confidence Threshold: ${this.config.consensus?.confidence_threshold || 75}%</label>
            <input type="range" id="confidence_threshold" min="50" max="95" value="${this.config.consensus?.confidence_threshold || 75}" />
            <small>Show warning when consensus confidence falls below this threshold</small>
          </div>
        </div>
      </div>
    ` : '';

    // Visibility tab content
    const visibilityTabContent = this._activeTab === 'visibility' ? `
      <div class="tab-content">
        <div class="section">
          <h3>Display Options</h3>
          
          <div class="field">
            <label>
              <input type="checkbox" id="show_breakdown" ${this.config.display?.show_source_breakdown ? 'checked' : ''} />
              Show Source Breakdown
            </label>
            <small>Display individual source temperatures and weights</small>
          </div>

          <div class="field">
            <label>
              <input type="checkbox" id="show_forecast" ${this.config.display?.show_forecast ? 'checked' : ''} />
              Show Forecast
            </label>
            <small>Display 5-day weather forecast</small>
          </div>
        </div>
      </div>
    ` : '';

    // Layout tab content
    const layoutTabContent = this._activeTab === 'layout' ? `
      <div class="tab-content">
        <div class="section">
          <h3>Card Appearance</h3>
          
          <div class="field">
            <label for="background">Background Style</label>
            <select id="background">
              <option value="gradient" ${this.config.display?.background === 'gradient' ? 'selected' : ''}>Gradient (Default)</option>
              <option value="plain" ${this.config.display?.background === 'plain' ? 'selected' : ''}>Plain</option>
            </select>
          </div>

          <div class="field">
            <label for="border_radius">Border Radius: ${this.config.display?.border_radius || 8}px</label>
            <input type="range" id="border_radius" min="0" max="20" value="${this.config.display?.border_radius || 8}" />
          </div>
        </div>
      </div>
    ` : '';

    this.shadowRoot.innerHTML = `
      <style>
        .editor {
          padding: 16px;
          font-family: var(--paper-font-body1_-_font-family);
        }

        .tab-bar {
          display: flex;
          border-bottom: 1px solid var(--divider-color);
          margin-bottom: 16px;
        }

        .tab {
          flex: 1;
          padding: 12px 16px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-size: 14px;
          color: var(--secondary-text-color);
        }

        .tab.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
        }

        .tab:hover:not(.active) {
          background: var(--paper-item-icon-active-color);
        }

        .tab-content {
          min-height: 300px;
        }

        .section {
          margin-bottom: 24px;
        }

        .section h3 {
          margin: 0 0 16px 0;
          color: var(--primary-text-color);
          font-size: 16px;
          font-weight: 500;
        }

        .field {
          margin-bottom: 16px;
        }

        .field label {
          display: block;
          margin-bottom: 4px;
          font-size: 14px;
          color: var(--primary-text-color);
          font-weight: 500;
        }

        .field input, .field select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          font-size: 14px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
        }

        .field input[type="range"] {
          padding: 0;
          height: 6px;
        }

        .field input[type="checkbox"] {
          width: auto;
          margin-right: 8px;
        }

        .field small {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          color: var(--secondary-text-color);
        }

        .source-config {
          background: var(--card-background-color);
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
        }

        .source-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .source-header h4 {
          margin: 0;
          font-size: 14px;
          color: var(--primary-text-color);
        }

        .remove-btn {
          background: var(--error-color);
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .add-btn {
          width: 100%;
          padding: 12px;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .add-btn:hover {
          opacity: 0.9;
        }
      </style>
      
      <div class="editor">
        <div class="tab-bar">
          <button class="tab ${this._activeTab === 'config' ? 'active' : ''}" data-tab="config">Config</button>
          <button class="tab ${this._activeTab === 'visibility' ? 'active' : ''}" data-tab="visibility">Visibility</button>
          <button class="tab ${this._activeTab === 'layout' ? 'active' : ''}" data-tab="layout">Layout</button>
        </div>

        ${configTabContent}
        ${visibilityTabContent}
        ${layoutTabContent}
      </div>
    `;

    this._setupEventListeners();
  }
}

// Register the editor
if (!customElements.get('multi-source-weather-card-editor')) {
  customElements.define('multi-source-weather-card-editor', MultiSourceWeatherCardEditor);
  console.log('Multi-Source Weather Card Editor registered successfully');
}
