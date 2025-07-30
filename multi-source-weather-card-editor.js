import { LitElement, html, css } from 'lit';

class MultiSourceWeatherCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _activeTab: { type: String }
    };
  }

  constructor() {
    super();
    this._activeTab = 'config';
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
  }

  _autoDetectSources() {
    if (!this.hass) return;

    const weatherEntities = Object.keys(this.hass.states)
      .filter(entityId => entityId.startsWith('weather.'))
      .map(entityId => {
        const entity = this.hass.states[entityId];
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
  }

  _titleChanged(ev) {
    this.config = {
      ...this.config,
      title: ev.target.value
    };
    this._fireConfigChanged();
  }

  _cardModeChanged(ev) {
    this.config = {
      ...this.config,
      card_mode: ev.target.value
    };
    this._fireConfigChanged();
  }

  _backgroundChanged(ev) {
    this.config = {
      ...this.config,
      display: {
        ...this.config.display,
        background: ev.target.value
      }
    };
    this._fireConfigChanged();
  }

  _borderRadiusChanged(ev) {
    this.config = {
      ...this.config,
      display: {
        ...this.config.display,
        border_radius: parseInt(ev.target.value)
      }
    };
    this._fireConfigChanged();
  }

  _showSourceBreakdownChanged(ev) {
    this.config = {
      ...this.config,
      display: {
        ...this.config.display,
        show_source_breakdown: ev.target.checked
      }
    };
    this._fireConfigChanged();
  }

  _showForecastChanged(ev) {
    this.config = {
      ...this.config,
      display: {
        ...this.config.display,
        show_forecast: ev.target.checked
      }
    };
    this._fireConfigChanged();
  }

  _confidenceThresholdChanged(ev) {
    this.config = {
      ...this.config,
      consensus: {
        ...this.config.consensus,
        confidence_threshold: parseInt(ev.target.value)
      }
    };
    this._fireConfigChanged();
  }

  _sourceEnabledChanged(ev, index) {
    const sources = [...this.config.sources];
    sources[index] = {
      ...sources[index],
      enabled: ev.target.checked
    };
    
    this.config = {
      ...this.config,
      sources
    };
    this._fireConfigChanged();
  }

  _sourceWeightChanged(ev, index) {
    const sources = [...this.config.sources];
    sources[index] = {
      ...sources[index],
      weight: parseInt(ev.target.value)
    };
    
    this.config = {
      ...this.config,
      sources
    };
    this._fireConfigChanged();
  }

  _addSource() {
    if (!this.hass) return;

    const availableEntities = Object.keys(this.hass.states)
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
  }

  _removeSource(index) {
    const sources = [...this.config.sources];
    sources.splice(index, 1);
    
    this.config = {
      ...this.config,
      sources
    };
    this._fireConfigChanged();
  }

  _getAvailableEntities() {
    if (!this.hass) return [];
    
    return Object.keys(this.hass.states)
      .filter(entityId => entityId.startsWith('weather.'))
      .map(entityId => ({
        value: entityId,
        label: this.hass.states[entityId].attributes.friendly_name || entityId
      }));
  }

  _sourceEntityChanged(ev, index) {
    const sources = [...this.config.sources];
    sources[index] = {
      ...sources[index],
      entity: ev.target.value
    };
    
    this.config = {
      ...this.config,
      sources
    };
    this._fireConfigChanged();
  }

  render() {
    if (!this.hass) {
      return html`<div>Loading...</div>`;
    }

    return html`
      <div class="card-config">
        <!-- Tab Navigation -->
        <div class="tab-bar">
          <button 
            class="tab ${this._activeTab === 'config' ? 'active' : ''}"
            @click=${() => this._switchTab('config')}
          >
            Config
          </button>
          <button 
            class="tab ${this._activeTab === 'visibility' ? 'active' : ''}"
            @click=${() => this._switchTab('visibility')}
          >
            Visibility
          </button>
          <button 
            class="tab ${this._activeTab === 'layout' ? 'active' : ''}"
            @click=${() => this._switchTab('layout')}
          >
            Layout
          </button>
        </div>

        <!-- Config Tab -->
        ${this._activeTab === 'config' ? html`
          <div class="tab-content">
            <!-- Basic Settings -->
            <div class="config-section">
              <div class="config-section-title">Basic Settings</div>
              
              <div class="form-row">
                <label class="form-label">Card Title</label>
                <input 
                  type="text" 
                  class="form-input"
                  .value=${this.config.title}
                  @input=${this._titleChanged}
                />
              </div>

              <div class="form-row">
                <label class="form-label">Card Mode</label>
                <select class="form-select" .value=${this.config.card_mode} @change=${this._cardModeChanged}>
                  <option value="default">Default</option>
                  <option value="compact">Compact</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>
            </div>

            <!-- Weather Sources -->
            <div class="config-section">
              <div class="config-section-title">Weather Sources</div>
              
              ${this.config.sources.map((source, index) => html`
                <div class="source-config">
                  <div class="source-header">
                    <div class="source-info">
                      <div class="source-name">
                        ${this.hass.states[source.entity]?.attributes.friendly_name || source.entity}
                      </div>
                      <div class="source-entity">${source.entity}</div>
                    </div>
                    <button class="remove-btn" @click=${() => this._removeSource(index)}>×</button>
                  </div>

                  <div class="form-row">
                    <label class="form-label">Entity</label>
                    <select class="form-select" .value=${source.entity} @change=${(ev) => this._sourceEntityChanged(ev, index)}>
                      ${this._getAvailableEntities().map(entity => html`
                        <option value=${entity.value} ?selected=${entity.value === source.entity}>
                          ${entity.label}
                        </option>
                      `)}
                    </select>
                  </div>

                  <div class="form-row">
                    <label class="form-label">
                      <input 
                        type="checkbox" 
                        .checked=${source.enabled}
                        @change=${(ev) => this._sourceEnabledChanged(ev, index)}
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
                      .value=${source.weight}
                      @input=${(ev) => this._sourceWeightChanged(ev, index)}
                    />
                  </div>
                </div>
              `)}

              <button class="add-btn" @click=${this._addSource}>+ Add Weather Source</button>
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
                  .value=${this.config.consensus.confidence_threshold}
                  @input=${this._confidenceThresholdChanged}
                />
                <div class="form-help">Show warning when consensus confidence falls below this threshold</div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Visibility Tab -->
        ${this._activeTab === 'visibility' ? html`
          <div class="tab-content">
            <div class="config-section">
              <div class="config-section-title">Display Options</div>
              
              <div class="form-row">
                <label class="form-label">
                  <input 
                    type="checkbox" 
                    .checked=${this.config.display.show_source_breakdown}
                    @change=${this._showSourceBreakdownChanged}
                  />
                  Show Source Breakdown
                </label>
                <div class="form-help">Display individual source temperatures and weights</div>
              </div>

              <div class="form-row">
                <label class="form-label">
                  <input 
                    type="checkbox" 
                    .checked=${this.config.display.show_forecast}
                    @change=${this._showForecastChanged}
                  />
                  Show Forecast
                </label>
                <div class="form-help">Display 5-day weather forecast</div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Layout Tab -->
        ${this._activeTab === 'layout' ? html`
          <div class="tab-content">
            <div class="config-section">
              <div class="config-section-title">Card Appearance</div>
              
              <div class="form-row">
                <label class="form-label">Background Style</label>
                <select class="form-select" .value=${this.config.display.background} @change=${this._backgroundChanged}>
                  <option value="gradient">Gradient (Default)</option>
                  <option value="plain">Plain</option>
                </select>
              </div>

              <div class="form-row">
                <label class="form-label">Border Radius: ${this.config.display.border_radius}px</label>
                <input 
                  type="range" 
                  class="form-range"
                  min="0" 
                  max="20" 
                  .value=${this.config.display.border_radius}
                  @input=${this._borderRadiusChanged}
                />
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  static get styles() {
    return css`
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
    `;
  }
}

customElements.define('multi-source-weather-card-editor', MultiSourceWeatherCardEditor);
