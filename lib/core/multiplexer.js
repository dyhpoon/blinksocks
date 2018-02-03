'use strict';Object.defineProperty(exports,'__esModule',{value:true});exports.Multiplexer=undefined;var _slicedToArray=function(){function sliceIterator(arr,i){var _arr=[];var _n=true;var _d=false;var _e=undefined;try{for(var _i=arr[Symbol.iterator](),_s;!(_n=(_s=_i.next()).done);_n=true){_arr.push(_s.value);if(i&&_arr.length===i)break}}catch(err){_d=true;_e=err}finally{try{if(!_n&&_i['return'])_i['return']()}finally{if(_d)throw _e}}return _arr}return function(arr,i){if(Array.isArray(arr)){return arr}else if(Symbol.iterator in Object(arr)){return sliceIterator(arr,i)}else{throw new TypeError('Invalid attempt to destructure non-iterable instance')}}}();var _extends=Object.assign||function(target){for(var i=1;i<arguments.length;i++){var source=arguments[i];for(var key in source){if(Object.prototype.hasOwnProperty.call(source,key)){target[key]=source[key]}}}return target};var _relay=require('./relay');var _utils=require('../utils');class Multiplexer{constructor(){this._relays=new Map;this._muxRelays=new Map;this.onNewSubConn=this.onNewSubConn.bind(this);this.onSubConnEncode=this.onSubConnEncode.bind(this);this.onDataFrame=this.onDataFrame.bind(this);this.onSubConnCloseBySelf=this.onSubConnCloseBySelf.bind(this);this.onSubConnCloseByProtocol=this.onSubConnCloseByProtocol.bind(this);this.onMuxConnClose=this.onMuxConnClose.bind(this)}couple({relay,remoteInfo,proxyRequest}){const muxRelay=this.getMuxRelay()||this.createMuxRelay(remoteInfo);if(!muxRelay.isOutboundReady()){muxRelay.init({proxyRequest})}else{proxyRequest.onConnected()}const cid=relay.id;relay.once('encode',buffer=>{muxRelay.encode(buffer,_extends({},proxyRequest,{cid}));relay.on('encode',buf=>this.onSubConnEncode(muxRelay,buf,cid))});relay.on('close',()=>this.onSubConnCloseBySelf(muxRelay,cid));muxRelay.__associateRelays.set(cid,relay);this._relays.set(cid,relay);_utils.logger.debug(`[mux] mix sub connection cid=${cid} into mux connection ${muxRelay.id}, total: ${this._muxRelays.size}`)}createMuxRelay(remoteInfo){const relay=new _relay.Relay({transport:__TRANSPORT__,remoteInfo,presets:__PRESETS__,isMux:true});const id=(0,_utils.generateMutexId)([...this._muxRelays.keys()],__MUX_CONCURRENCY__);relay.id=id;relay.__associateRelays=new Map;relay.on('muxDataFrame',this.onDataFrame);relay.on('muxCloseConn',this.onSubConnCloseByProtocol);relay.on('close',()=>this.onMuxConnClose(relay));this._muxRelays.set(id,relay);_utils.logger.debug(`[mux] create mux connection ${id}`);return relay}decouple({relay:muxRelay,remoteInfo}){muxRelay.__associateRelays=new Map;muxRelay.on('muxNewConn',args=>this.onNewSubConn(_extends({},args,{remoteInfo})));muxRelay.on('muxDataFrame',this.onDataFrame);muxRelay.on('muxCloseConn',this.onSubConnCloseByProtocol);muxRelay.on('close',()=>this.onMuxConnClose(muxRelay));this._muxRelays.set(muxRelay.id,muxRelay)}onNewSubConn({cid,host,port,remoteInfo}){const relay=new _relay.Relay({transport:__TRANSPORT__,remoteInfo,presets:[]});relay.__pendingFrames=[];const proxyRequest={host:host,port:port,onConnected:()=>{var _iteratorNormalCompletion=true;var _didIteratorError=false;var _iteratorError=undefined;try{for(var _iterator=relay.__pendingFrames[Symbol.iterator](),_step;!(_iteratorNormalCompletion=(_step=_iterator.next()).done);_iteratorNormalCompletion=true){const frame=_step.value;relay.decode(frame)}}catch(err){_didIteratorError=true;_iteratorError=err}finally{try{if(!_iteratorNormalCompletion&&_iterator.return){_iterator.return()}}finally{if(_didIteratorError){throw _iteratorError}}}relay.__pendingFrames=null}};const muxRelay=this.getMuxRelay();if(muxRelay){relay.init({proxyRequest});relay.id=cid;relay.on('encode',buffer=>this.onSubConnEncode(muxRelay,buffer,cid));relay.on('close',()=>this.onSubConnCloseBySelf(muxRelay,cid));muxRelay.__associateRelays.set(cid,relay);this._relays.set(cid,relay);_utils.logger.debug(`[mux] create sub connection cid=${relay.id}, total: ${this._relays.size}`);return relay}else{_utils.logger.warn('cannot create new sub connection due to no mux relay are available')}}getMuxRelay(){const relays=this._muxRelays;const concurrency=relays.size;if(__IS_CLIENT__&&concurrency>=__MUX_CONCURRENCY__||__IS_SERVER__){return relays.get([...relays.keys()][(0,_utils.getRandomInt)(0,concurrency-1)])}else{return null}}onSubConnEncode(muxRelay,buffer,cid){muxRelay.encode(buffer,{cid})}onDataFrame({cid,data}){const relay=this._relays.get(cid);if(!relay){_utils.logger.error(`[mux] fail to route data frame, no such sub connection: cid=${cid}`);return}if(__IS_CLIENT__||relay.isOutboundReady()){relay.decode(data)}else{relay.__pendingFrames=[];relay.__pendingFrames.push(data)}}onSubConnCloseBySelf(muxRelay,cid){muxRelay.encode(Buffer.alloc(0),{cid,isClosing:true});muxRelay.__associateRelays.delete(cid);this._relays.delete(cid)}onSubConnCloseByProtocol({cid}){const relay=this._relays.get(cid);if(relay){relay.destroy();this._relays.delete(cid);_utils.logger.verbose(`[mux] close sub connection: cid=${cid}`)}}onMuxConnClose(muxRelay){const subRelays=muxRelay.__associateRelays;_utils.logger.debug(`[mux] mux connection ${muxRelay.id} is destroyed, cleanup ${subRelays.size} sub relays`);var _iteratorNormalCompletion2=true;var _didIteratorError2=false;var _iteratorError2=undefined;try{for(var _iterator2=subRelays[Symbol.iterator](),_step2;!(_iteratorNormalCompletion2=(_step2=_iterator2.next()).done);_iteratorNormalCompletion2=true){const _ref=_step2.value;var _ref2=_slicedToArray(_ref,2);const relay=_ref2[1];relay.destroy()}}catch(err){_didIteratorError2=true;_iteratorError2=err}finally{try{if(!_iteratorNormalCompletion2&&_iterator2.return){_iterator2.return()}}finally{if(_didIteratorError2){throw _iteratorError2}}}muxRelay.__associateRelays.clear();this._muxRelays.delete(muxRelay.id)}}exports.Multiplexer=Multiplexer;