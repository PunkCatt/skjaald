/**
 * Extend the base TokenDocument class to implement system-specific HP bar logic.
 * @extends {TokenDocument}
 */
export class TokenDocument5e extends TokenDocument {

  /** @inheritdoc */
  getBarAttribute(...args) {
    const data = super.getBarAttribute(...args);
    if ( data && (data.attribute === "attributes.hp") ) {
      data.value += parseInt(getProperty(this.actor.data, "data.attributes.hp.grit") || 0);
      data.max += parseInt(getProperty(this.actor.data, "data.attributes.hp.tempmax") || 0);
    }
    return data;
  }

  static getTrackedAttributes(data, _path=[]) {
    const attributes = super.getTrackedAttributes(data, _path);
    // console.log(attributes);
    if ( _path.length ){ return attributes;}
    const allowed = CONFIG.SKJAALD.trackableAttributes;
    // console.log(allowed);
    attributes.value = attributes.value.filter(attrs => this._isAllowedAttribute(allowed, attrs));
    return attributes;
  }

  /**
   * Get an Array of attribute choices which are suitable for being consumed by an item usage.
   * @param {object} data  The actor data.
   * @returns {{bar: string[], value: string[]}}
   */
  static getConsumedAttributes(data) {
    console.log(data);
    const attributes = super.getTrackedAttributes(data);
    attributes.bar = [['attributes','hp','value'],['attributes','encumberance','value'],['resources','primary','value'],['resources','secondary','value'],
        ['resources','tertiary','value'],['item','uses','value'],['item','hp','value'],['item', 'quantity'],['item','weight'],['item','duration','value'],['item','armor','value'],
        ['item','target'],['item','range'],['item','save','dc']];
    

    const allowed = CONFIG.SKJAALD.consumableResources;
    // console.log(allowed);
    // console.log(attributes);
    attributes.value = [['attributes','hp','hitDicecurrent'], ["attributes", 'hp', 'grit'], ["attributes", 'dp', 'value'], ['attributes','ration', 'value'], 
    ['attributes', 'waterskin','value'], ['details', 'honor'], ['details','morality'],['attributes','movement','walk'],['attributes','ac','flat'],
    ['attributes','senses','blindsight'], ['attributes','senses','darkvision'],['attributes','senses','special'],['attributes','senses','tremorsense'],['attributes','senses','truesight'],
    
    
    ['skills','acr','total'],['skills','ani','total'],['skills','ath','total'],
    ['skills','dec','total'],['skills','his','total'],['skills','ins','total'],['skills','inv','total'],['skills','itm','total'],['skills','med','total'],
    ['skills','nat','total'],['skills','per','total'],['skills','prc','total'],['skills','prf','total'],['skills','rel','total'],['skills','slt','total'],
    ['skills','ste','total'],['skills','sur','total'],
    
    ['skills','acr','passive'],['skills','ani','passive'],['skills','ath','passive'],
    ['skills','dec','passive'],['skills','his','passive'],['skills','ins','passive'],['skills','inv','passive'],['skills','itm','passive'],['skills','med','passive'],
    ['skills','nat','passive'],['skills','per','passive'],['skills','prc','passive'],['skills','prf','passive'],['skills','rel','passive'],['skills','slt','passive'],
    ['skills','ste','passive'],['skills','sur','passive']];
    console.log(attributes);
    return attributes;
   }

  /**
   * Traverse the configured allowed attributes to see if the provided one matches.
   * @param {object} allowed  The allowed attributes structure.
   * @param {string[]} attrs  The attributes list to test.
   * @returns {boolean}       Whether the given attribute is allowed.
   * @private
   */
  static _isAllowedAttribute(allowed, attrs) {
    let allow = allowed;
    for ( const attr of attrs ) {
      console.log(attr);
      console.log(attr);
      if ( allow === undefined ) return false;
      if ( allow === true ) {console.log(attr); return true};
      if ( allow["*"] !== undefined ) allow = allow["*"];
      else allow = allow[attr];
    }
    return allow !== undefined;
  }
}


/* -------------------------------------------- */


/**
 * Extend the base Token class to implement additional system-specific logic.
 * @extends {Token}
 */
export class Token5e extends Token {

  /** @inheritdoc */
  _drawBar(number, bar, data) {
    if ( data.attribute === "attributes.hp" ) return this._drawHPBar(number, bar, data);
    return super._drawBar(number, bar, data);
  }

  /* -------------------------------------------- */

  /**
   * Specialized drawing function for HP bars.
   * @param {number} number      The Bar number
   * @param {PIXI.Graphics} bar  The Bar container
   * @param {object} data        Resource data for this bar
   * @private
   */
  _drawHPBar(number, bar, data) {

    // Extract health data
    let {value, max, temp, tempmax} = this.document.actor.data.data.attributes.hp;
    temp = Number(temp || 0);
    tempmax = Number(tempmax || 0);

    // Differentiate between effective maximum and displayed maximum
    const effectiveMax = Math.max(0, max + tempmax);
    let displayMax = max + (tempmax > 0 ? tempmax : 0);

    // Allocate percentages of the total
    const tempPct = Math.clamped(temp, 0, displayMax) / displayMax;
    const valuePct = Math.clamped(value, 0, effectiveMax) / displayMax;
    const colorPct = Math.clamped(value, 0, effectiveMax) / displayMax;

    // Determine colors to use
    const blk = 0x000000;
    const hpColor = PIXI.utils.rgb2hex([(1-(colorPct/2)), colorPct, 0]);
    const c = CONFIG.SKJAALD.tokenHPColors;

    // Determine the container size (logic borrowed from core)
    const w = this.w;
    let h = Math.max((canvas.dimensions.size / 12), 8);
    if ( this.data.height >= 2 ) h *= 1.6;
    const bs = Math.clamped(h / 8, 1, 2);
    const bs1 = bs+1;

    // Overall bar container
    bar.clear();
    bar.beginFill(blk, 0.5).lineStyle(bs, blk, 1.0).drawRoundedRect(0, 0, w, h, 3);

    // Temporary maximum HP
    if (tempmax > 0) {
      const pct = max / effectiveMax;
      bar.beginFill(c.tempmax, 1.0).lineStyle(1, blk, 1.0).drawRoundedRect(pct*w, 0, (1-pct)*w, h, 2);
    }

    // Maximum HP penalty
    else if (tempmax < 0) {
      const pct = (max + tempmax) / max;
      bar.beginFill(c.negmax, 1.0).lineStyle(1, blk, 1.0).drawRoundedRect(pct*w, 0, (1-pct)*w, h, 2);
    }

    // Health bar
    bar.beginFill(hpColor, 1.0).lineStyle(bs, blk, 1.0).drawRoundedRect(0, 0, valuePct*w, h, 2);

    // Temporary hit points
    if ( temp > 0 ) {
      bar.beginFill(c.temp, 1.0).lineStyle(0).drawRoundedRect(bs1, bs1, (tempPct*w)-(2*bs1), h-(2*bs1), 1);
    }

    // Set position
    let posY = (number === 0) ? (this.h - h) : 0;
    bar.position.set(0, posY);
  }

}