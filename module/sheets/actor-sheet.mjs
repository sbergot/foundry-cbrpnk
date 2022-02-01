import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from "../helpers/effects.mjs";

const RollStatus = {
  failure: "failure",
  partial: "partial",
  success: "success",
  critical: "critical",
};

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class CbrpnkActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["cbrpnk", "sheet", "actor"],
      template: "systems/cbrpnk/templates/actor/actor-sheet.html",
      width: 650,
      height: 600,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "play",
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/cbrpnk/templates/actor/actor-${this.actor.data.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.data.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.data = actorData.data;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == "character") {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == "npc") {
      this._prepareItems(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    for (let [k, v] of Object.entries(context.data.approaches)) {
      v.label = game.i18n.localize(CONFIG.CBRPNK.approaches(k)) ?? "error";
      v.detail = game.i18n.localize(CONFIG.CBRPNK.approachesDetail(k)) ?? "error";
      v.glitch = game.i18n.localize(CONFIG.CBRPNK.approachesGlitch(k)) ?? "error";
    }
    for (let [k, v] of Object.entries(context.data.skills)) {
      v.label = game.i18n.localize(CONFIG.CBRPNK.skills(k)) ?? k;
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    const features = [];
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
    };

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === "item") {
        gear.push(i);
      }
      // Append to features.
      else if (i.type === "feature") {
        features.push(i);
      }
      // Append to spells.
      else if (i.type === "spell") {
        if (i.data.spellLevel != undefined) {
          spells[i.data.spellLevel].push(i);
        }
      }
    }

    // Assign and return
    context.gear = gear;
    context.features = features;
    context.spells = spells;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find(".item-edit").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find(".item-create").click(this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.find(".item-delete").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html
      .find(".effect-control")
      .click((ev) => onManageActiveEffect(ev, this.actor));

    // Rollable abilities.
    html.find(".rollable").click(this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find("li.item").each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == "item") {
        const itemId = element.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
      if (dataset.rollType == "action") {
        let label = dataset.label ? dataset.label : "";
        const value = this.evaluateFormula(dataset.rollValue);
        let formula = "";
        const zeroSkill = value <= 0;
        if (zeroSkill) {
          formula = "2d6kl";
        } else {
          formula = `${value}d6kh`;
        }
        const roll = new Roll(formula);
        await roll.evaluate({ async: true });
        this.showActionRoll(roll, zeroSkill, label);
        return roll;
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? dataset.label : "";
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get("core", "rollMode"),
      });
      return roll;
    }
  }

  evaluateFormula(formula) {
    return parseInt(Roll.replaceFormulaData(formula, this.actor.getRollData()));
  }

  async showActionRoll(rolls, zeroSkill, label) {
    // we are always rolling Nd6 so we have exactly 1 DiceTerm
    const results = rolls.dice[0].results.map((r) => r.result);
    let main_result = null;
    let second_result = null;
    if (zeroSkill) {
      results.sort((a, b) => a - b); // ascending sort
      main_result = results[0];
      second_result = 0;
    } else {
      results.sort((a, b) => b - a); // descending sort
      main_result = results[0];
      second_result = results[1] ?? 0;
    }

    let roll_status = "";
    if (main_result <= 3) {
      roll_status = RollStatus.failure;
    } else if (main_result <= 5) {
      roll_status = RollStatus.partial;
    } else if (main_result == 6) {
      roll_status =
        second_result == 6 ? RollStatus.critical : RollStatus.success;
    }

    const level = zeroSkill ? 0 : results.length;
    const toolTipHtml = await rolls.getTooltip();
    const html = await renderTemplate(
      "systems/cbrpnk/templates/chat/action-roll.html",
      { roll_status, label, level, tooltip: toolTipHtml }
    );
    let messageData = {
      speaker: ChatMessage.getSpeaker(),
      content: html,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rolls,
    };

    CONFIG.ChatMessage.documentClass.create(messageData, {});
  }
}
