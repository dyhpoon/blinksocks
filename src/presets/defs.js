/* eslint-disable no-unused-vars */
import EventEmitter from 'events';
import { PIPE_ENCODE } from '../constants';
import { CONNECT_TO_REMOTE } from './actions';
import { kebabCase } from '../utils';

/**
 * @lifecycle
 *   static onCheckParams()
 *   static onCache()
 *   constructor()
 *   onInit()
 *   ...
 *   onDestroy()
 *
 * @note
 *   static onCheckParams() and static onCache() are called only once since new Hub().
 */
export class IPreset extends EventEmitter {

  _config = null;

  _write({ type, buffer, direct, isUdp }, extraArgs) {
    const postfix = (type === PIPE_ENCODE ? 'Out' : 'In') + (isUdp ? 'Udp' : '');

    // prepare args
    const broadcast = (action) => this.emit('broadcast', this.name, action);
    const fail = (message) => this.emit('fail', this.name, message);
    const next = (processed, isReverse = false) => {
      // oh my nice hack to deal with reverse pipeline if haven't been created
      const hasListener = this.emit(`next_${isReverse ? -type : type}`, processed);
      if (!hasListener) {
        direct(processed, isReverse);
      }
    };

    // clientXXX, serverXXX
    const nextLifeCycleHook = (buf/*, isReverse = false */) => {
      const args = { buffer: buf, next, broadcast, direct, fail };
      const ret = this._config.is_client ? this[`client${postfix}`](args, extraArgs) : this[`server${postfix}`](args, extraArgs);
      if (ret instanceof Buffer) {
        next(ret);
      }
    };

    // beforeXXX
    // NOTE: next(buf, isReverse) is not available in beforeXXX
    const args = { buffer, next: nextLifeCycleHook, broadcast, direct, fail };
    const ret = this[`before${postfix}`](args, extraArgs);
    if (ret instanceof Buffer) {
      nextLifeCycleHook(ret);
    }
  }

  get name() {
    return kebabCase(this.constructor.name).replace(/(.*)-preset/i, '$1');
  }

  /**
   * check params passed to the preset, if any errors, should throw directly
   * @param params
   */
  static onCheckParams(params) {

  }

  /**
   * you can make some cache in store or just return something
   * you want to put in store, then access store later in other
   * hook functions via this.getStore()
   * @param params
   * @param store
   */
  static onCache(params, store) {
    // or return something
  }

  /**
   * constructor
   * @param config
   * @param params
   */
  constructor({ config, params } = {}) {
    super();
    this._config = config;
  }

  /**
   * constructor alternative to do initialization
   * @param params
   */
  onInit(params) {

  }

  /**
   * you can do something when preset destroyed
   */
  onDestroy() {

  }

  // hooks for tcp

  beforeOut({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  beforeIn({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  clientOut({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  serverIn({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  serverOut({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  clientIn({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  // hooks for udp

  beforeOutUdp({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  beforeInUdp({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  clientOutUdp({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  serverInUdp({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  serverOutUdp({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  clientInUdp({ buffer/* , next, broadcast, direct, fail */ }) {
    return buffer;
  }

  // reserved methods, DO NOT overwrite them!

  next(type, buffer) {
    this.emit(`next_${type}`, buffer);
  }

  /**
   * direct read any property(match non-static then static) of other preset
   * @param presetName
   * @param propertyName
   */
  readProperty(presetName, propertyName) {

  }

  /**
   * return store passed to onCache()
   */
  getStore() {

  }

}

/**
 * a class which handle addressing
 */
export class IPresetAddressing extends IPreset {

  /**
   * triggered once target address resolved on client side
   * @param host
   * @param port
   */
  onInitTargetAddress({ host, port }) {

  }

  // reserved methods, DO NOT overwrite them!

  /**
   * call it when target address was resolved on server side
   * @param host
   * @param port
   * @param callback
   */
  resolveTargetAddress({ host, port }, callback) {
    const action = { type: CONNECT_TO_REMOTE, payload: { host, port, onConnected: callback } };
    this.emit('broadcast', this.name, action);
  }

}
