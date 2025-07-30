// Multi-Source Weather Consensus Card Editor
class MultiSourceWeatherCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._activeTab = 'config';
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  setConfig(config) {
    this.config = {
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
        confidence_threshold: 75,
        disagreement_threshold: 25
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
      .map(entityId => {
        const integrationName = this._getIntegrationName(entityId);
        
        return {
          entity: entityId,
          weight: this._getSuggestedWeight(integrationName),
          enabled: true
        };
      })
      .slice(0, 5);

    this.config = {
      ...this.config,
      sources: weatherEntities
    };

    this._fireConfigChanged();
  }

  _getIntegrationName(entityId) {
    const parts = entityId.split('.');
    const name = parts[1] || '';
    
    const mappings = {
      'met_no': 'met.no',
      'openweathermap': 'OpenWeatherMap',
      'buienradar': 'Buienradar',
      'accuweather': 'AccuWeather',
      'weatherapi': 'WeatherAPI'
    };

    return mappings[name] || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  _getSuggestedWeight(integrationName) {
    const weights = {
      'met.no': 35,
      'OpenWeatherMap': 30,
      'Buienradar': 25,
      'AccuWeather': 20,
      'WeatherAPI': 15
    };

    return weights[integrationName] || 20;
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

  _updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    this._fireConfigChanged();
    this._render();
  }

  _updateDisplayConfig(updates) {
    this.config = {
      ...this.config,
      display: { ...this.config.display, ...updates }
    };
    this._fireConfigChanged();
    this._render();
  }

  _updateConsensusConfig(updates) {
    this.config = {
      ...this.config,
      consensus: { ...this.config.consensus, ...updates }
    };
    this._fireConfigChanged();
    this._render();
  }

  _updateSource(index, updates) {
    const sources = [...this.config.sources];
    sources[index] = { ...sources[index], ...updates };
    this.config = { ...this.config, sources };
    this._fireConfigChanged();
    this._render();
  }

  _addSource() {
    if (!this._hass) return;

    const availableEntities = Object.keys(this._hass.states)
      .filter(entityId => entityId.startsWith('weather.'))
      .filter(entityId => !this.config.sources.find(s => s.entity === entityId));

    if (availableEntities.length === 0) return;

    const entityId = availableEntities[0];
    const integrationName = this._getIntegrationName(entityId);

    this.config = {
      ...this.config,
      sources: [
        ...this.config.sources,
        {
          entity: entityId,
          weight: this._getSuggestedWeight(integrationName),
          enabled: true
        }
      ]
    };
    this._fireConfigChanged();
    this._render();
  }

  _removeSource(index) {
    const sources = [...this.config.sources];
    sources.splice(index, 1);
    this.config = { ...this.config, sources };
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

  _render() {
    if (!this._hass) {
      this.shadowRoot.innerHTML = '<div>Loading...</div>';
      return;
    }

    const configTabContent = this._activeTab === 'config' ? `
      <div class="tab-content">
        <!-- Basic Settings -->
        <div class="config-section">
          <div class="config-section-title">Basic Settings</div>
          
          <div class="form-row">
            <label class="form-label">Card Title</label>
            <input 
              type="text" 
              class="form-input"
              value="${this.config.title}"
              onchange="this.getRootNode().host._updateConfig({title: this.value})"
            />
          </div>

          <div class="form-row">
            <label class="form-label">Card Mode</label>
            <select class="form-select" value="${this.config.card_mode}" onchange="this.getRootNode().host._updateConfig({card_mode: this.value})">
              <option value="default" ${this.config.card_mode === 'default' ? 'selected' : ''}>Default</option>
              <option value="compact" ${this.config.card_mode === 'compact' ? 'selected' : ''}>Compact</option>
              <option value="detailed" ${this.config.card_mode === 'detailed' ? 'selected' : ''}>Detailed</option>
            </select>
          </div>
        </div>

        <!-- Weather Sources -->
        <div class="config-section">
          <div class="config-section-title">Weather Sources</div>
          
          ${this.config.sources.map((source, index) => `
            <div class="source-config">
              <div class="source-header">
                <div class="source-info">
                  <div class="source-name">
                    ${this._hass.states[source.entity]?.attributes.friendly_name || source.entity}
                  </div>
                  <div class="source-entity">${source.entity}</div>
                </div>
                <button class="remove-btn" onclick="this.getRootNode().host._removeSource(${index})">×</button>
              </div>

              <div class="form-row">
                <label class="form-label">Entity</label>
                <select class="form-select" value="${source.entity}" onchange="this.getRootNode().host._updateSource(${index}, {entity: this.value})">
                  ${this._getAvailableEntities().map(entity => `
                    <option value="${entity.value}" ${entity.value === source.entity ? 'selected' : ''}>
                      ${entity.label}
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="form-row">
                <label class="form-label">
                  <input 
                    type="checkbox" 
                    ${source.enabled ? 'checked' : ''}
                    onchange="this.getRootNode().host._updateSource(${index}, {enabled: this.checked})"
                  />
                  Enabled
                </label>
              </div>

              <div class="form-row">
                <label class="form-label">Weight: ${source.weight}%</label>
                <input 
                  type="range" 
                  class="form-range"
                  min="0" 
                  max="100" 
                  value="${source.weight}"
                  oninput="this.getRootNode().host._updateSource(${index}, {weight: parseInt(this.value)})"
                />
              </div>
            </div>
          `).join('')}

          <button class="add-btn" onclick="this.getRootNode().host._addSource()">+ Add Weather Source</button>
        </div>

        <!-- Consensus Settings -->
        <div class="config-section">
          <div class="config-section-title">Consensus Algorithm</div>
          
          <div class="form-row">
            <label class="form-label">Confidence Threshold: ${this.config.consensus.confidence_threshold}%</label>
            <input 
              type="range" 
              class="form-range"
              min="50" 
              max="95" 
              value="${this.config.consensus.confidence_threshold}"
              oninput="this.getRootNode().host._updateConsensusConfig({confidence_threshold: parseInt(this.value)})"
            />
            <div class="form-help">Show warning when consensus confidence falls below this threshold</div>
          </div>
        </div>
      </div>
    ` : '';

    const visibilityTabContent = this._activeTab === 'visibility' ? `
      <div class="tab-content">
        <div class="config-section">
          <div class="config-section-title">Display Options</div>
          
          <div class="form-row">
            <label class="form-label">
              <input 
                type="checkbox" 
                ${this.config.display.show_source_breakdown ? 'checked' : ''}
                onchange="this.getRootNode().host._updateDisplayConfig({show_source_breakdown: this.checked})"
              />
              Show Source Breakdown
            </label>
            <div class="form-help">Display individual source temperatures and weights</div>
          </div>

          <div class="form-row">
            <label class="form-label">
              <input 
                type="checkbox" 
                ${this.config.display.show_forecast ? 'checked' : ''}
                onchange="this.getRootNode().host._updateDisplayConfig({show_forecast: this.checked})"
              />
              Show Forecast
            </label>
            <div class="form-help">Display 5-day weather forecast</div>
          </div>
        </div>
      </div>
    ` : '';

    const layoutTabContent = this._activeTab === 'layout' ? `
      <div class="tab-content">
        <div class="config-section">
          <div class="config-section-title">Card Appearance</div>
          
          <div class="form-row">
            <label class="form-label">Background Style</label>
            <select class="form-select" value="${this.config.display.background}" onchange="this.getRootNode().host._updateDisplayConfig({background: this.value})">
              <option value="gradient" ${this.config.display.background === 'gradient' ? 'selected' : ''}>Gradient (Default)</option>
              <option value="plain" ${this.config.display.background === 'plain' ? 'selected' : ''}>Plain</option>
            </select>
          </div>

          <div class="form-row">
            <label class="form-label">Border Radius: ${this.config.display.border_radius}px</label>
            <input 
              type="range" 
              class="form-range"
              min="0" 
              max="20" 
              value="${this.config.display.border_radius}"
              oninput="this.getRootNode().host._updateDisplayConfig({border_radius: parseInt(this.value)})"
            />
          </div>
        </div>
      </div>
    ` : '';

    this.shadowRoot.innerHTML = `
      <style>
        .card-config {
          padding: 16px;
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
          transition: all 0.2s;
        }

        .tab.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
        }

        .tab:hover:not(.active) {
          background: var(--divider-color);
        }

        .tab-content {
          min-height: 400px;
        }

        .config-section {
          margin-bottom: 24px;
        }

        .config-section-title {
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 16px;
          color: var(--primary-text-color);
        }

        .form-row {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 8px;
          color: var(--primary-text-color);
        }

        .form-input, .form-select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          font-size: 14px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
        }

        .form-input:focus, .form-select:focus {
          outline: none;
          border-color: var(--primary-color);
        }

        .form-range {
          width: 100%;
          -webkit-appearance: none;
          height: 6px;
          border-radius: 3px;
          background: var(--divider-color);
          outline: none;
        }

        .form-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--primary-color);
          cursor: pointer;
        }

        .form-range::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--primary-color);
          cursor: pointer;
          border: none;
        }

        .form-help {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: 4px;
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
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .source-name {
          font-weight: 500;
          color: var(--primary-text-color);
        }

        .source-entity {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: 2px;
        }

        .remove-btn {
          background: var(--error-color);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
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
          font-weight: 500;
        }

        .add-btn:hover {
          opacity: 0.9;
        }

        input[type="checkbox"] {
          margin-right: 8px;
          accent-color: var(--primary-color);
        }
      </style>
      
      <div class="card-config">
        <!-- Tab Navigation -->
        <div class="tab-bar">
          <button 
            class="tab ${this._activeTab === 'config' ? 'active' : ''}"
            onclick="this.getRootNode().host._switchTab('config')"
          >
            Config
          </button>
          <button 
            class="tab ${this._activeTab === 'visibility' ? 'active' : ''}"
            onclick="this.getRootNode().host._switchTab('visibility')"
          >
            Visibility
          </button>
          <button 
            class="tab ${this._activeTab === 'layout' ? 'active' : ''}"
            onclick="this.getRootNode().host._switchTab('layout')"
          >
            Layout
          </button>
        </div>

        ${configTabContent}
        ${visibilityTabContent}
        ${layoutTabContent}
      </div>
    `;
  }
}

customElements.define('multi-source-weather-card-editor', MultiSourceWeatherCardEditor);
