/* eslint-disable prettier/prettier */
import { LitElement, html, customElement, CSSResult, TemplateResult, css, PropertyDeclarations } from 'lit-element';

import * as packageDetails from '../package.json';

declare global {
  interface Window {
    customCards: {
      type: string;
      name: string;
      description: string;
    }[];
  }
}

console.info(
  `%c  LOVELACE-STEAM-CARD \n%c  ${packageDetails.version}   `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'lovelace-steam-card',
  name: 'Lovelace Steam Card',
  description: 'A card to show Steam integrations',
});

import { format } from 'timeago.js';

@customElement('lovelace-steam-card')
class LovelaceSteamCard extends LitElement {
  hass;
  config;
  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      config: {},
    };
  }

  render(): TemplateResult {
    return html`
      <ha-card>
        ${this.config.entity
          ? this.createEntityCard(this.hass.states[this.config.entity])
          : this.createEntitiesCard(this.config.entities)}
      </ha-card>
    `;
  }

  setConfig(config): void {
    if (!config.entities && !config.entity) {
      throw new Error('You need to define either a single entity or an entities field');
    }
    this.config = config;
  }

  // The height of your card. Home Assistant uses this to automatically
  // distribute all cards over the available columns.
  getCardSize(): number {
    return this.config.entities ? this.config.entities.length + 1 : 2;
  }

  _toggle(state): void {
    this.hass.callService('homeassistant', 'toggle', {
      entity_id: state.entity_id,
    });
  }

  createEntitiesCard(entities): TemplateResult[] {
    if (typeof entities === 'string') {
      const newEntities = [] as string[];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.values(this.hass.states).forEach((entity: any) => {
        if (entity.entity_id.startsWith(entities)) {
          newEntities.push(entity.entity_id);
        }
      });

      entities = newEntities;
    }

    if (this.config.online_only) {
      const newEntities = [] as string[];

      entities.forEach((entity: string) => {
        const entityObj = this.hass.states[entity];
        if (entityObj && entityObj.state && entityObj.state !== 'offline') {
          newEntities.push(entity);
        }
      });

      entities = newEntities;
    }

    const cardTitle = (this.config.title ??= 'Steam Friends');

    return [
      html` <div class="card-header"><div class="name">${cardTitle}</div></div> `,
      ...entities.map((ent, index) => {
        const entity = this.hass.states[ent];
        return entity
          ? html`
              <div
                class="lovelace-steam-multi lovelace-clickable ${index === entities.length - 1
                  ? 'lovelace-last'
                  : ''} ${entity.state}"
                @click=${() => this.handlePopup(entity)}
              >
                <div class="lovelace-steam-user">
                  <img src="${entity.attributes.entity_picture}" class="lovelace-steam-avatar" />
                  <div class="lovelace-steam-username">${entity.attributes.friendly_name}</div>
                </div>
                <div class="lovelace-steam-value">${entity.attributes.game || '-'}</div>
                ${entity.attributes.game && this.config.game_background
                  ? html` <img src="${entity.attributes.game_image_header}" class="lovelace-steam-game-bg" /> `
                  : ''}
              </div>
            `
          : html` <div class="not-found">Entity ${ent} not found.</div> `;
      }),
    ];
  }

  handlePopup(entity) {
    const entityId = entity.entity_id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = new Event('hass-more-info', { composed: true }) as any;
    e.detail = { entityId };
    this.dispatchEvent(e);
  }

  createEntityCard(entity): TemplateResult {
    return html`
      <div class="lovelace-container lovelace-clickable" @click=${() => this.handlePopup(entity)}>
        <div class="lovelace-steam-username">
          ${this.config.friendly_name ? this.config.friendly_name : entity.attributes.friendly_name}
        </div>
        ${this.renderUserAvatar(entity)}
        <div class="lovelace-steam-online-status">${entity.state}</div>
        <div class="lovelace-steam-level">
          <span class="lovelace-steam-level-text-container">
            <span class="lovelace-steam-level-text">${entity.attributes.level}</span>
          </span>
          <ha-icon icon="mdi:shield"></ha-icon>
        </div>
        <div class="lovelace-steam-last-online">
          <span>
            <ha-icon icon="mdi:clock-outline"></ha-icon>
            ${entity.state === 'online' ? 'Online Since' : 'Last Online'}
          </span>
          <span> ${this.formatLastOnline(entity.attributes.last_online)} </span>
        </div>
        ${this.renderCurrentlyPlayingGame(entity)}
      </div>
    `;
  }

  formatLastOnline(lastOnline): string {
    return format(new Date(lastOnline));
  }

  renderUserAvatar(entity): TemplateResult {
    return entity.attributes.entity_picture
      ? html` <img src="${entity.attributes.entity_picture}" class="lovelace-steam-avatar" /> `
      : html` <ha-icon icon="${entity.attributes.icon}" class="lovelace-steam-avatar"></ha-icon> `;
  }

  renderCurrentlyPlayingGame(entity): TemplateResult {
    const currentlyPlayingGame = entity.attributes.game;

    return currentlyPlayingGame
      ? html`
          <div class="lovelace-steam-now-playing">
            <div class="label">Now Playing</div>
            <div class="game-title">${entity.attributes.game}</div>
            <img class="game-img" src="${entity.attributes.game_image_header}" />
          </div>
        `
      : html``;
  }

  static get styles(): CSSResult {
    return css`
      /* :host {
      } */

      .card-header {
        width: 100%;
        padding-top: 8px;
        padding-bottom: 8px;
      }

      .lovelace-clickable {
        cursor: pointer;
      }

      .lovelace-steam-value {
        padding: 0 0.3em;
      }

      .lovelace-steam-value,
      .lovelace-steam-user {
        z-index: 2;
      }

      .lovelace-steam-game-bg {
        z-index: 0;
        position: absolute;
        right: 0;
        height: 170%;
        width: auto;
        opacity: 0.5;
        mask-image: linear-gradient(to right, transparent 10%, black 90%);
        -webkit-mask-image: linear-gradient(to right, transparent 10%, black 90%);
      }

      .not-found {
        background-color: yellow;
        font-family: sans-serif;
        font-size: 14px;
        padding: 8px;
      }

      ha-card,
      ha-card > .lovelace-container {
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .lovelace-container {
        width: 100%;
      }

      .lovelace-steam-avatar {
        border-radius: 50%;
        width: 40px;
        height: 40px;
        margin: 8px;
      }

      ha-icon.lovelace-steam-avatar {
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.8);
      }

      .lovelace-steam-level {
        position: relative;
        margin: 16px;
      }

      .lovelace-steam-level > .lovelace-steam-level-text-container {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        /* align-items: center; */
        margin-top: 2px;
        color: var(--secondary-background-color);
        z-index: 2;
        /* fix for font */
        transform: translateY(1px);
      }

      .lovelace-steam-last-online {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .lovelace-steam-now-playing {
        width: 100%;
        overflow: hidden;
        margin-top: 2em;
      }

      .lovelace-steam-now-playing > .game-title {
        font-size: 1.7em;
        margin: 0.2em 0 1.5em;
      }

      .lovelace-steam-now-playing > .game-img {
        width: 100%;
        height: auto;
      }

      .lovelace-steam-multi {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 0 0 8px;
        position: relative;
        overflow: hidden;
      }

      .lovelace-steam-multi .lovelace-steam-user {
        display: flex;
        align-items: center;
      }

      .lovelace-steam-multi .lovelace-steam-avatar {
        margin: 0 16px 0 0;
      }

      .lovelace-steam-multi::before {
        z-index: 1;
        position: absolute;
        bottom: 0;
        left: 2em;
        width: 1em;
        height: 1em;
        border-radius: 50%;
        background: #646464;
        background-image: radial-gradient(top, #616161 0%, #616161 20%, #535353 60%);
        content: '';
        z-index: 3;
      }

      .lovelace-steam-multi.online::before,
      .lovelace-steam-multi.snooze::before {
        box-shadow: 0 0 1em #1c1c17, 0 0 1em #ff4242;
        background: #ff4f4f;
      }

      .lovelace-last {
        margin-bottom: 0;
      }
    `;
  }
}
