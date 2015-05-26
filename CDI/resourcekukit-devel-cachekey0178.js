




/*
     FILE ARCHIVED ON 4:47:07 Dec 23, 2014 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 13:07:09 May 16, 2015.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/

/* - ++resource++kukit-devel.js - */
/*
* Copyright (c) 2005-2007
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

/*global kukit, document, window */

kukit = new function() {   /// MODULE START

var ku = this;

ku.isDevelMode = false;
    ku.isDevelMode = true;

var _isKineticStylesheet = function(node) {
    var rel = node.rel;
    if (rel=="kinetic-stylesheet") {
        return true;
    }
    // BBB to be removed after 2008-02-17
    if (rel=="kukit" || rel=="k-stylesheet") {
        var msg = node.href + ': rel "' + rel +'" is deprecated;';
        msg = msg + ' use "kinetic-stylesheet" instead.';
        kukit.logWarning(msg);
        return true;
    }
    return false;
};

/*
* class _RuleSheetLink
*/
var _RuleSheetLink = function(href, res_type) {
    this.href = href;
    this.res_type = res_type;
};


/*
* class Engine
*/
ku.Engine = function() {

this.initialize = function() {
    this.documentRules = new kukit.rd.MethodTable();
    // table from res_type to rule processor
    this._ruleProcessorClasses = {};
    // register processor for type kss
    this._ruleProcessorClasses.kss = kukit.kssp.KssRuleProcessor;
    this._ruleProcessors = [];
    this.bindScheduler = new kukit.ut.SerializeScheduler();
    // State vars storage. This can be used from kss via a method.
    this.stateVariables = {};
    // instantiate request manager
    this.requestManager = new kukit.rm.RequestManager();
    this.binderInfoRegistry = new kukit.er.BinderInfoRegistry();
    // instantiate a load scheduler
    this.loadScheduler = new kukit.rd.LoadActions();
    this.initializedOnDOMLoad = false;
    // setup events queuing, collect them at the end of commands
    this.setupEventsQueue = [];
    this.setupEventsInProgress = false;
    this.baseUrl = this.calculateBase();
};

this.calculateBase = function() {
    var base = '';
    // returns empty base when not in browser (cli tests)
    try {
        var _dummy = document;
        _dummy = window;
    } catch (e) {
        // testing or what
        return base;
    }
    base = kukit.ut.calculateBase(document, window.location.href);
    return base;
};

this.getRuleSheetLinks = function() {
    var nodes = document.getElementsByTagName("link");
    var results = [];
    for (var i=0; i<nodes.length; i++) {
        if (_isKineticStylesheet(nodes[i])) {
            var res_type = null;
            // Resource syntax is decided on type attribute.
            if((nodes[i].type == 'text/css') || (nodes[i].type == 'text/kss')) {
                res_type = 'kss';
            } else {
                // Just show this, and go on with the processing.
                kukit.logError("rel type is not text/css or text/kss");
            }
            var newRuleLink = new _RuleSheetLink(nodes[i].href, res_type);
            results[results.length] = newRuleLink;
        }
    }
    return results;
};

this.createRuleProcessor = function(rulelink) {
    var _RuleProcessorClass = this._ruleProcessorClasses[rulelink.res_type];
    var msg = '';
    if (_RuleProcessorClass) {
        msg = "Start loading and processing " + rulelink.href;
        msg = msg + " of type " + rulelink.res_type;
        kukit.log(msg);
        var ruleprocessor = new _RuleProcessorClass(rulelink.href);
        this._ruleProcessors[this._ruleProcessors.length] = ruleprocessor;
        return ruleprocessor;
    } else {
        msg = "Ignore rulesheet " + rulelink.href;
        msg = msg + " of type " + rulelink.res_type;
        kukit.log(msg);
    }
    return null;
};


this.getRules = function() {
    var rules = [];
    var ruleProcessors = this._ruleProcessors;
    for (var j=0; j<ruleProcessors.length; j++) {
        var ruleProcessor = ruleProcessors[j];
        for (var i=0; i<ruleProcessor.rules.length; i++) {
            rules.push(ruleProcessor.rules[i]);
        }
    }
    return rules;
};

this.getRuleProcessors = function() {
    return this._ruleProcessors;
};

this.setupEvents = function(inNodes) {
    if (this.setupEventsInProgress) {
        // remember them
        this.setupEventsQueue = this.setupEventsQueue.concat(inNodes);
    } else {
        // do it
        this.doSetupEvents(inNodes);
    }
};

this.beginSetupEventsCollection = function() {
    this.setupEventsInProgress = true;
};

this.finishSetupEventsCollection = function() {
    this.setupEventsInProgress = false;
    var setupEventsQueue = this.setupEventsQueue;
    this.setupEventsQueue = [];
    this.doSetupEvents(setupEventsQueue);
};

this.doSetupEvents = function(inNodes) {
    var self = this;
    var deferredEventsSetup = function() {
        self._setupEvents(inNodes);
    };
    var targetMsg;
    var found = false;
    if ( ! inNodes) {
        targetMsg = 'document';
        found = true;
    } else {
        targetMsg = 'nodes subtrees ';
        for (var i=0; i<inNodes.length; i++) {
            var node = inNodes[i];
            if (node.nodeType == 1) {
                if (! found) {
                    found = true;
                } else {
                    targetMsg += ', '; 
                }
                targetMsg += '[' + node.tagName.toLowerCase() + ']';
            }
        }
    }
    if (found) {
        var remark = '';
        remark += 'Setup of events for ' + targetMsg;
        this.bindScheduler.addPre(deferredEventsSetup, remark);
    }
};

this._setupEvents = function(inNodes) {
    // Decide phase. 1=initial, 2=insertion.
    var phase;
    if (typeof(inNodes) == 'undefined') {
        phase = 1;
    } else {
        phase = 2;
    }
    this.binderInfoRegistry.startBindingPhase();
    kukit.log('Selection of HTML nodes starts.');
    var rules = this.getRules();
    var ruletable = new kukit.rd.RuleTable(this.loadScheduler);
    for (var y=0; y < rules.length; y++) {
        rules[y].mergeForSelectedNodes(ruletable, phase, inNodes);
    }
    kukit.log('Binding of document starts.');
    if (phase == 1) {
        this.documentRules.bindall(phase);
    }
    // finally bind the merged events
    kukit.log('Binding of HTML nodes starts.');
    ruletable.bindall(phase);

    // ... and do the actual binding. 
    this.binderInfoRegistry.processBindingEvents();
};

this.initializeRules = function() {
    var msg = '';
    if (window.kukitRulesInitializing || window.kukitRulesInitialized) {
        // Refuse to initialize a second time.
        kukit.log('[initializeRules] is called twice.');
        return;
    }
    kukit.log('Initializing kinetic stylesheets.');
    // Succesful initialization. At the moment the engine is kept
    // as a global variable, but this needs refinement in the future.
    kukit.engine = this;
    window.kukitRulesInitializing = true;
    // load the rulesheets
    var rulelinks = this.getRuleSheetLinks();
    kukit.log("Count of kinetic stylesheet links: " + rulelinks.length);
    for (var i=0; i<rulelinks.length; i++) {
        var rulelink = rulelinks[i];
        var ruleprocessor = this.createRuleProcessor(rulelink);
        if (ruleprocessor) {
            var ts_start = (new Date()).valueOf();
            ruleprocessor.load();
            var ts_loaded = (new Date()).valueOf();
            ruleprocessor.parse();
            var ts_end = (new Date()).valueOf();
            msg = "Finished loading and processing " + rulelink.href;
            msg += " resource type " + rulelink.res_type;
            msg += ' in ' + (ts_loaded - ts_start) + ' + ';
            msg += (ts_end - ts_loaded) + ' ms.';
            kukit.log(msg);
        }
    }
    try {
        this.setupEvents();
    } catch(e) {
        // Event setup errors are logged.
        if (e.name == 'RuleMergeError' || e.name == 'EventBindError') {
           msg = 'Events setup - ' + e.toString();
            // Log the message
            kukit.logFatal(msg);
            // and throw it...
            throw new Error(msg);
        } else {
            throw e;
        }
    }
    window.kukitRulesInitializing = false;
    window.kukitRulesInitialized = true;
};
this.initialize.apply(this, arguments);
};



/* XXX deprecated methods, to be removed asap 
 * (this was used from the plone plugin only, 
 * to allow the event-registration.js hook)
 */

ku.initializeRules = function() {
    var msg = '[kukit.initializeRules] is deprecated,';
    msg += 'use [kukit.bootstrap] instead !';
    kukit.logWarning(msg);
    kukit.bootstrap();
};

ku.bootstrap = function() {
    kukit.log('Instantiate engine.');
    var engine = new kukit.Engine();
    kukit.log('Engine instantiated.');
    // Successful initializeRules will store the engine as kukit.engine. 
    // Subsequent activations will not delete the already set up engine.
    // Subsequent activations may happen, if more event handlers are set up,
    // and the first one will do the job, the later ones are ignored.
    engine.initializeRules();
};

ku.bootstrapFromDOMLoad = function() {
    kukit.log('Engine instantiated in [DOMLoad].');
    var engine = new kukit.Engine();
    // Successful initializeRules will store the engine as kukit.engine. 
    // Subsequent activations will not delete the already set up engine.
    // Subsequent activations may happen, if more event handlers are set up,
    // and the first one will do the job, the later ones are ignored.
    engine.initializedOnDOMLoad = true;
    engine.initializeRules();
};

}();                              /// MODULE END


/*
* Copyright (c) 2005-2007
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

/* Create kukit namespace */

if (typeof(kukit) == 'undefined') {
    var kukit = {};
}

    /*  ----------------------------------------------------------------
     *  Lines starting with the ;;; are only cooked in development mode.
     *  ----------------------------------------------------------------
     */

/*
 * kukit.E is a proxy variable used globally for error and info messages.
 * This assure the following code can be used:
 *    
 *     ;;; kukit.E = 'This is the error message';
 *     throw new Error(kukit.E);
 *
 * or:
 *
 *     ;;; kukit.E = 'The event' + event + ' caused problems';
 *     method_with_info(x, kukit.E);
 *
 * or even:
 *
 *     ;;; kukit.E = 'The event' + event + ' caused problems ';
 *     ;;; kukit.E += 'and this is a very long line ';
 *     ;;; kukit.E += 'so we split it to parts for better readibility';
 *     ;;; kukit.logWarning(kukit.E);
 *
 */
kukit.E = 'Unknown message (kss optimized for production mode)';

// Browser identification. We need these switches only at the moment.
try {
    kukit.HAVE_SAFARI = navigator.vendor && 
        navigator.vendor.indexOf('Apple') != -1;
    kukit.HAVE_IE = eval("_SARISSA_IS_IE");
} catch (e) {}

    // Activation of extra logging panel: if necessary
    // this allows to start the logging panel from the browser with
    //    javascript:kukit.showLog();
    kukit.showLog = function() {
        var msg = 'Logging is on the console: request to show logging pane';
        msg += ' ignored.';
        kukit.logWarning(msg);
    };

/*
 * Cookie handling code taken from: 
 * /web/20141223044707/http://www.quirksmode.org/js/cookies.html
 * Cookie handling is in dom.js, but this method
 * is needed right here for log handling.
 */

kukit.readCookie = function(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
};

// a null function that is used for logging
kukit._null = function() {};

kukit._COOKIE_LOGLEVEL = '__kss_loglevel';

// an empty logger
kukit._logger = new function() {

    this.updateLogLevel = function() {
        // set default level
        this.loglevel = 0;
        // read the cookie
        /// (ignore if we run from test)
        var cookie;
        try {
            // in test, document would throw ReferenceError
            var _dummy = document;
        } catch(e) {
            var _dummy;
        }
        if (_dummy && typeof(document.cookie) != 'undefined') {
            cookie = kukit.readCookie(kukit._COOKIE_LOGLEVEL);
        }
        if (cookie) {
            // decode it to a numeric level
            cookie = cookie.toLowerCase();
            // Cookies are quoted in Zope, for some reason (???)
            // ie we get '"VALUE"' here. Let's compensate this.
            if (cookie.substr(0, 1) == '"') {
                cookie = cookie.substr(1, cookie.length - 2);
            }
            if (cookie == 'debug') this.loglevel = 0;
            if (cookie == 'info') this.loglevel = 1;
            if (cookie == 'warning') this.loglevel = 2;
            if (cookie == 'error') this.loglevel = 3;
        };
        // Call the function that sets up the handlers
        this._setupHandlers();
        // Wrap the just set up handlers, to include wrapping
        this.logDebug = this._logFilter(this.logDebug, 0);
        this.log = this._logFilter(this.log, 1);
        this.logWarning = this._logFilter(this.logWarning, 2);
        this.logError = this._logFilter(this.logError, 3);
        this.logFatal = this._logFilter(this.logFatal, 3);
    };

    // Log filter, for use from the handlers.
    this._logFilter = function(f, currentlevel) {
        return (currentlevel >= this.loglevel) ? f : kukit._null;
    };

    // This sets up the handlers and allows to set them
    // up again with a different cookie setting.
    // Will be overwritten by different loggers.
    this._setupHandlers = function() {
        this.logDebug = kukit._null;
        this.log = kukit._null;
        this.logWarning = kukit._null;
        this.logError = kukit._null;
        this.logFatal = kukit._null;
    };
}();

// Stub functions that can be used for logging
kukit.logDebug = function(message) {kukit._logger.logDebug(message);};
kukit.log = function(message) {kukit._logger.log(message);};
kukit.logWarning = function(message) {kukit._logger.logWarning(message);};
kukit.logError = function(message) {kukit._logger.logError(message);};
kukit.logFatal = function(message) {kukit._logger.logFatal(message);};

// Function to change the log level from javascript
// level must be one of "DEBUG", "INFO", "WARNING", "ERROR".
// (Small caps are tolerated as well)
kukit.setLogLevel = function(level) {
        // Store it in the cookie so that it persists through requests.
        kukit.dom.createCookie(kukit._COOKIE_LOGLEVEL, level);
        // re-establish the log handlers, based on this cookie setting
        kukit._logger.updateLogLevel();
};

// We want a way of knowing if Firebug is available :
// it is very convenient to log a node in Firebug;
// you get a clickable result that brings you to Firebug inspector.
// The pattern is the following :
//  if (kukit.hasFirebug) {
//     kukit.log(node);
//  }

    // check whether the logging stuff of Firebug is available
    kukit.hasFirebug = function() {
       var result = typeof console != 'undefined';
       result = result && typeof console.log != 'undefined';
       result = result && typeof console.debug != 'undefined';
       result = result && typeof console.error != 'undefined';
       result = result && typeof console.warn != 'undefined';
       return result;
    }();

    // Set up logging for FireBug
    if (kukit.hasFirebug) {
        kukit._logger._setupHandlers = function() {
            // for debug level we also log as 'info', because we do
            // not want FireBug to display line information.
            this.logDebug = console.log;
            this.log = console.log;
            this.logWarning = console.warn;
            this.logError = console.error;
            this.logFatal = console.error;
        };
    }

    // check whether the logging stuff of MochiKit is available
    kukit.hasMochiKit = function() {
       var result = typeof MochiKit != 'undefined';
       result = result && typeof MochiKit.Logging != 'undefined';
       result = result && typeof MochiKit.Logging.log != 'undefined';
       return result;
    }();

    // Set up logging for MochiKit
    if (! kukit.hasFirebug && kukit.hasMochiKit) {
        kukit._logger._setupHandlers = function() {
            this.logDebug = MochiKit.Logging.logDebug;
            this.log = MochiKit.Logging.log;
            this.logWarning = MochiKit.Logging.logWarning;
            this.logError = MochiKit.Logging.logError;
            this.logFatal = MochiKit.Logging.logFatal;
        };
        // make convenience url
        //    javascript:kukit.showLog();
        // instead of the need to say
        //    javascript:void(createLoggingPane(true));
        kukit.showLog = function() {
            createLoggingPane(true);
        };
    }

    // check whether the logging stuff of Safari is available
    kukit.hasSafari = function() {
       var result = typeof console != 'undefined';
       result = result && typeof console.log != 'undefined';
       return result;
    }();

    // Set up logging for Safari
    if (! kukit.hasFirebug && ! kukit.hasMochiKit && kukit.hasSafari) {
        kukit._logger._setupHandlers = function() {
            this.logDebug = function(str) { console.log('DEBUG: '+str); };
            this.log = function(str) { console.log('INFO: '+str); };
            this.logWarning = function(str) { console.log('WARNING: '+str); };
            this.logError = function(str) { console.log('ERROR: '+str); };
            this.logFatal = function(str) { console.log('FATAL: '+str); };
        };
    }

// Initialize the logger with the solution we've just detected
kukit._logger.updateLogLevel();

// log a startup message
    kukit.log('Loading KSS engine.');

/* utilities */

kukit.ut = new function() {   /// MODULE START

var ut = this;


/* 
* class FifoQueue
*/
ut.FifoQueue = function () {

this.initialize = function () {
    this.reset();
};

this.reset = function() {
    this.elements = new Array();
};

this.push = function(obj) {
    this.elements.push(obj);
};

this.pop = function() {
    return this.elements.shift();
};

this.empty = function() {
    return ! this.elements.length;
};

this.size = function() {
    return this.elements.length;
};

this.front = function() {
    return this.elements[0];
};
this.initialize.apply(this, arguments);
};

/*
* class SortedQueue
*/
ut.SortedQueue = function() {

this.initialize = function(comparefunc) {
    // comparefunc(left, right) determines the order by returning 
    // -1 if left should occur before right,
    // +1 if left should occur after right or 
    //  0 if left and right  have no preference as to order.
    // If comparefunc is not specified or is undefined,
    // the default order specified by < used.
    if (comparefunc) {
        this.comparefunc = comparefunc;
    }
    this.reset();
};

this.comparefunc = function(a, b) {
    if (a < b) {
        return -1;
    } else if (a > b) {
        return +1;
    } else {
        return 0;
    }
};

this.reset = function() {
    this.elements = new Array();
};

this.push = function(obj) {
    // Find the position of the object.
    var i = 0;
    var length = this.elements.length;
    while (i < length && this.comparefunc(this.elements[i], obj) == -1) {
        i ++;
    }
    // and insert it there
    this.elements.splice(i, 0, obj);
};

this.pop = function() {
    // takes minimal element
    return this.elements.shift();
};

this.popn = function(n) {
    // takes first n minimal element
    return this.elements.splice(0, n);
};

this.empty = function() {
    return ! this.elements.length;
};

this.size = function() {
    return this.elements.length;
};

this.get = function(n) {
    return this.elements[n];
};

this.front = function() {
    return this.elements[0];
};
this.initialize.apply(this, arguments);
};

ut.evalBool = function(value, errname) {
    if (value == 'true' || value == 'True' || value == '1') {
        value = true;
    } else if (value == 'false' || value == 'False' || value == '0'
        || value == '') {
        value = false;
        } else {
            throw new Error('Bad boolean value "' + value + '" ' + errname);
    }
    return value;
};

ut.evalInt = function(value, errname) {
        try {
        value = parseInt(value);
        } catch(e) {
            throw new Error('Bad integer value "' + value + '" ' + errname);
        }
    return value;
};

ut.evalList = function(value, errname) {
    try {
        // remove whitespace from beginning, end
        value = value.replace(/^ +/, '');
        //while (value && value.charAt(0) == ' ') {
        //    value = value.substr(1);
        //}
        value = value.replace(/ +$/, '');
        if (value == '') {
            value = [];
        } else {
            // do the splitting
            value = value.split(/ *, */);
        }
    } catch(e) {
        throw new Error('Bad list value "' + value + '" ' + errname);
    }
    return value;
};

/* 
* class TimerCounter
*
* for repeating or one time timing
*/
ut.TimerCounter = function() {

this.initialize = function(delay, func, restart) {
    this.delay = delay;
    this.func = func;
    if (typeof(restart) == 'undefined') {
        restart = false;
    }
    this.restart = restart;
    this.timer = null;
};

this.start = function() {
    if (this.timer) {
        kukit.E = 'Timer already started.';

        throw new Error(kukit.E);
    }
    var self = this;
    var func = function() {
        self.timeout();
    };
    this.timer = setTimeout(func, this.delay);
};

this.timeout = function() {
    // Call the event action
    this.func();
    // Restart the timer
    if (this.restart) {
        this.timer = null;
        this.start();
    }
};

this.clear = function() {
    if (this.timer) {
        window.clearTimeout(this.timer);
        this.timer = null;
    }
    this.restart = false;
};
this.initialize.apply(this, arguments);
};

/*
* class Scheduler
*/
ut.Scheduler = function() {

this.initialize = function(func) {
    this.func = func;
    this.timer = null;
    this.nextWake = null;
};

this.setNextWake = function(ts) {
    // Sets wakeup time, null clears
    if (this.nextWake) {
        this.clear();
    }
    if (! ts) {
        return;
    }
    var now = (new Date()).valueOf();
    if (ts > now) {
        this.nextWake = ts;
        var self = this;
        var func = function() {
            self.timeout();
        };
        this.timer = setTimeout(func, ts - now);
    } else {
        // if in the past, run immediately
        this.func();
    }
};

this.setNextWakeAtLeast = function(ts) {
    // Sets wakeup time, unless it would wake up later than the
    // currently set timeout. Null clears the timer.
    if (! ts || ! this.nextWake || ts < this.nextWake) {
        this.setNextWake(ts);
    } else {
        var now = (new Date()).valueOf();
        // XXX why compute now and not use it ?
    }
};

this.timeout = function() {
    // clear the timer
    this.timer = null;
    this.nextWake = null;
    // Call the event action
    this.func();
};

this.clear = function() {
    if (this.nextWake) {
        window.clearTimeout(this.timer);
        this.timer = null;
        this.nextWake = null;
    }
};
this.initialize.apply(this, arguments);
};

/* 
* class SerializeScheduler
*
* Scheduler for serializing bind and load procedures
*/
ut.SerializeScheduler = function() {

this.initialize = function() {
    this.items = [];
    this.lock = false;
};

this.addPre = function(func, remark) {
    this.items.push({func: func, remark: remark});
    this.execute();
};

this.addPost = function(func, remark) {
    this.items.unshift({func: func, remark: remark});
    this.execute();
};

this.execute = function() {
    if (! this.lock) {
        this.lock = true;
        while (true) {
            var item = this.items.pop();
            if (! item) {
                break;
            }
            kukit.log(item.remark + ' starts.');
            var ts_start = (new Date()).valueOf();
            try {
                item.func();
            } catch(e) {
                this.lock = false;
                throw e;
            }
            var ts_end = (new Date()).valueOf();
            var msg = item.remark + ' finished in ';
            msg += (ts_end - ts_start) + ' ms.';
            kukit.log(msg);
        }
        this.lock = false;
    }
};
this.initialize.apply(this, arguments);
};

/* Browser event binding */

/* extracted from Plone */
// cross browser function for registering event handlers
ut.registerEventListener = function(elem, event, func) {
    if (elem.addEventListener) {
        elem.addEventListener(event, func, false);
        return true;
    } else if (elem.attachEvent) {
        var result = elem.attachEvent("on"+event, func);
        return result;
    }
    // maybe we could implement something with an array
    return false;
};

if (typeof(window) != 'undefined') {
    ut.registerEventListener(window, "load", kukit.bootstrap);
}

/* collecting keys-values into a dict or into a tuple list */

/*
* class DictCollector
*/
ut.DictCollector = function() {

this.initialize = function() {
    this.result = {};
};

this.add = function(key, value) {
    this.result[key] = value;
};
this.initialize.apply(this, arguments);
};

/*
* class TupleCollector
*/
ut.TupleCollector = function() {

this.initialize = function() {
    this.result = [];
};

this.add = function(key, value) {
    this.result.push([key, value]);
};
this.initialize.apply(this, arguments);
};

ut.calculateBase = function(documentInstance, pageLocation) {
    var base = '';
    // fetch base from specific link in case of ill situations
    // like default pages in Plone 
    var nodes = documentInstance.getElementsByTagName("link");
    if (nodes.length > 0) {
        for (var i=0; i<nodes.length; i++) {
            var link = nodes[i];
            if (link.rel == 'kss-base-url') {
                var base = link.href;
                // XXX Special handling for Plone and systems that has a broken
                // url generated in base.
                //
                // kss-base-url is currently giving us the page url without the
                // trailing / and the method called within the page. Page is always the
                // real page we are viewing, without the trailing method section. 
                //
                // Examples:
                //
                // url entered in browser                        kss-base-url
                // ----------------------                        ------------
                // /web/20141223044707/http://127.0.0.1:8080/portal                  ...portal/front-page
                // /web/20141223044707/http://127.0.0.1:8080/portal/view             ...portal
                // /web/20141223044707/http://127.0.0.1:8080/portal/front-page       ...portal/front-page
                // /web/20141223044707/http://127.0.0.1:8080/portal/front-page/view  ...portal/front-page
                //
                // ... so, we *always* need to put a trailing slash to the end
                // to be standard compatible and compensate for the following
                // code, that correctly removes the part after the last slash.
                //
                if (! /\/$/.test(base)) {
                    // (actually, we always get here right now
                    // since it never has the /, but to be sure,
                    // we only add it if it's not there)
                    base = base + '/';
                }
            }
        }
    }
    // if no override, fetch as usual first from base tag
    // then from page url if no base tag
    if (!base) {
        nodes = documentInstance.getElementsByTagName("base");
        if (nodes.length != 0) {
            var base = nodes[0].href;
        } else {
            var base = pageLocation;
        }
    }
    // remove last piece until '/'
    var pieces = base.split('/');
    pieces.pop();
    // base url needs a trailing '/' 
    base = pieces.join('/') + '/';
    return base;
};

}();                              /// MODULE END


/*
* Copyright (c) 2005-2007
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

kukit.err = new function () {        /// MODULE START

var err = this;

/* 
* Exception factory 
*
* Create exception helpers:
*
*    this.explicitError = function(errorcommand){
*        var kw = {'foo': 'blah'};
*        return setErrorInfo(null, 'ExplicitError', message, kw);
*     };
*
>
* Throwing:
*    (There is no longer a "new" before creating the exception.)
*
* throw kukit.mymodule.explicitError("There was an error in my program.");
*
* Catching example:
*
*   ...
*    } catch(e) {
*        if (e.name == 'explicitError') {
*            ...
*        } else {
*            throw(e);
*        }
*    }
*
* It is allowed to make a new error from a previous one, see examples in this file.
* However you should use annotation and always throw back the original error,
* otherwise traceback information will be lost.
*
*/

/*
*  class ErrorAnnotation
*/

var ErrorAnnotation = function() {

    this.constructError = function(e, name, message, kw) {
        if (typeof(kw) == "undefined") {
            kw = {};
        }
        this.kw = kw;
        this.message = name + ': ' + message;
        var addMessage = true;
        if (!e) {
            e = new Error(message);
            addMessage = false;
        } else if (typeof(e) == "string") {
            kukit.E = 'Do not raise string exceptions, as we cannot ';
            kukit.E += 'annotate them properly. Use: throw new Error(msg);';
            e = new Error(kukit.E);
        }
        this.previous_info = e.info;
        e.name = name;
        e.info = this;
        if (addMessage) {
            var fullMessage = message + ' [' + e.message + ']';
            // for FF, and Safari:
            e.message = fullMessage;
            // for IE, message is ignored, description is used.
            e.description = fullMessage;
            }
        return e;
    };
   
    this._logRecursive = function() {
        kukit.logError(this.message);
        if (this.previous_info) {
            this.previous_info._logRecursive();
        }
    };
   
    this.log = function() {
        // This is for debugging only, normal error handling
        // does not use it.
        kukit.logFatal('KSS error, stack information follows:');
        this._logRecursive();
    };

};

var setErrorInfo = function(e, name, message, kw) {
    return new ErrorAnnotation().constructError(e, name, message, kw);
};

/* Protects a function */


/* 
 * Explicit error represents that the server side action failed and
 * we need to handle this with an explicit error action defined from
 * kss.
 * There are three main cases when this can happen:
 * 
 * 1. In case the server explicitely sent us an error (hence the 
 *    name of this class) the parameter will contain the kss 
 *    command from the payload.
 *
 * 2. If a payload response parsing error lead us here, then it
 *    will contain a string of the error message.
 *
 * 3. If a timeout of the response happened, the parameter will 
 *    contain the text "timeout".
 */
err.explicitError = function(errorcommand){
    var kw = {'errorcommand': errorcommand};
    kukit.E = 'Explicit error';
    return setErrorInfo(null, 'ExplicitError', kukit.E, kw);
};

err.responseParsingError = function(message){
    return setErrorInfo(null, 'ResponseParsingError', message);
};

    err.ruleMergeError = function(message){
       return setErrorInfo(null, 'RuleMergeError', message);
    };

    err.kssSelectorError = function(message){
       return setErrorInfo(null, 'RuleMergeError', message);
    };


err.parsingError = function(message, cursor){
   var kw = {};
       if (cursor) {
            kw.errpos = cursor.pos;
            kw.errrow = cursor.row;
            kw.errcol = cursor.col;
            message += ', at row ' + kw.errrow + ', column ' + kw.errcol;
       } else {
            kw.errpos = null;
            kw.errrow = null;
            kw.errcol = null;
       }
   return setErrorInfo(null, 'ParsingError', message, kw);
};


/* Exceptions that re-throw (annotate) an already caught error */

    err.commandExecutionError = function(e, command){
       var message = 'Command [' + command.name + '] failed';
       return setErrorInfo(e, 'CommandExecutionError', message);
    };


    err.eventBindError = function(e, eventNames, eventNamespaces){
       var kw = {};
       kw.eventNames = eventNames;
       kw.eventNamespaces = eventNamespaces;
       var message = 'When binding event name(s) [' + eventNames;
       message += '] in namespace [' + eventNamespaces + '].';
       return setErrorInfo(e, 'EventBindError', message, kw);
    };


    err.undefinedEventError = function(e, message){
       return setErrorInfo(e, 'UndefinedEventError', message);
    };


    err.kssParsingError = function(e, url){
       var kw = {url: url};
       var message = 'Error parsing KSS at ' + url;
       return setErrorInfo(e, 'KssParsingError', message, kw);
    };


    err.eventSetupError = function(e, message){
       var message = 'Error setting up events';
       return setErrorInfo(e, 'EventSetupError', message);
    };

}();                              /// MODULE END


/*
* Copyright (c) 2006-2007
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

kukit.op = new function() {   /// MODULE START

var op = this;

/*
* class Oper
*
*  This is a single parameter that contains a collection
*  of operation objects to pass by, at various
*  operations.
*
*  Node and parms are the one to be accessed really, but the rest
*  is also accessible to read for special event implementations.
*
*
*  The members are:
*
*  node: the node in focus, to which the event triggered
*
*  parms: a dictionary that holds the parms to the function.
*      All parms are named ones.
*
*  eventRule: The eventRule associated by the trigger.
*
*  binder: The event binder instance that holds the event state
*       and on which all events are executed.
*
*  orignode: in case when a command has returned from a server action, 
*      this holds the original node that triggered the event first.
*
*  browserevent: the original browser event.
*/
op.Oper = function() {

this.initialize = function(dict) {
    this.node = null;
    this.parms = {};
    this.eventRule = null;
    this.binder = null;
    this.orignode = null;
    this.action = null;
    this.browserevent = null;

    this.clone = function(dict, restricted) {
        var newoper = new kukit.op.Oper(this);
        newoper.unrestrictedUpdate(dict, restricted);
        return newoper;
    };

    this.update = function(dict) {
        // restricted attrs must not be changed on existing oper.
        this.unrestrictedUpdate(dict, true);
    };

    this.unrestrictedUpdate = function(dict, restricted) {
        if (typeof(dict) == 'undefined') {
            return;
        }
        for (var key in dict) {
            if (typeof(checkKey) == 'undefined') {
                var checkKey = function(key) {
                    var isNode = key == 'node';
                    var isParameters = key == 'parms';
                    var isEventRule = key == 'eventRule';
                    var isBinder = key == 'binder';
                    var isOrig = key == 'orignode';
                return isNode || isParameters || isEventRule || isBinder || isOrig;
                };
            }
            if (restricted && checkKey(key)) {
                kukit.E = 'Illegal update on oper object, protected attribute [';
                kukit.E += key + '].';
                throw new Error(kukit.E);
            }
            var value = dict[key];
            if (typeof(value) != 'function') {
                this[key] = value;
            }
        }
    };
    // update from the dict
    this.unrestrictedUpdate(dict);
};

this.clone = function(dict, restricted) {
    var newoper = new kukit.op.Oper(this);
    newoper.unrestrictedUpdate(dict, restricted);
    return newoper;
};

this.update = function(dict) {
    // restricted attrs must not be changed on existing oper.
    this.unrestrictedUpdate(dict, true);
};

this.unrestrictedUpdate = function(dict, restricted) {
    if (typeof(dict) == 'undefined') {
        return;
    }
    for (var key in dict) {
        if (typeof(checkKey) == 'undefined') {
            var checkKey = function(key) {
                var isNode = key == 'node';
                var isParameters = key == 'parms';
                var isEventRule = key == 'eventRule';
                var isBinder = key == 'binder';
                var isOrig = key == 'orignode';
                return isNode || isParameters || isEventRule || isBinder || isOrig;
            };
        }
        if (restricted && checkKey(key)) {
            kukit.E = 'Illegal update on oper object, protected attribute [';
            kukit.E += key + '].';
            throw new Error(kukit.E);
        }
        var value = dict[key];
        if (typeof(value) != 'function') {
            this[key] = value;
        }
    }
};

this.logDebug = function() {
    var result = [];
    for (var key in this){
        if (key == 'parms') {
            var res2 = [];
            for (var k2 in this.parms){
                res2.push(k2 + '="' + this.parms[k2] + '"');
            }
            result.push('parms={' + res2.join(',') + '}');
        } else if (typeof(kukit.op.Oper.prototype[key]) == 'undefined') {
            result.push(key + '=' + this[key]);
        }
    }
    kukit.logDebug('Oper values: ' + result.join(', '));
};

this.executeClientAction = function(name) {
    // Check kss action parms
    var nodes = null;
    // XXX TODO this should be refactored with parms constraint checking
    for (key in this.kssParms) {
        switch (key) {
            case 'kssSelector': {
                // The value already contains the results
                nodes = this.kssParms[key];
            } break;
            default: {
               kukit.E = 'Wrong parameter : [' + key + '] starts with ';
               kukit.E += '"kss"; normal parms (that do not start with';
               kukit.E += ' "kss") only are allowed in action-client keys.';
               throw new Error(kukit.E);
            } break;
        }
    }
    // XXX TODO refactor this with commands execution (or the other way)
    var nodetext = function(node) {
        if (node) {
            return node.tagName.toLowerCase();
        } else {
            return 'DOCUMENT';
        }
    };
    var executeActions = kukit.actionsGlobalRegistry.get(name);
    if (nodes != null) { 
        var msg = nodes.length + ' nodes found for action [' + name + '].';
        kukit.logDebug(msg);
        if (!nodes || nodes.length == 0) {
            kukit.logWarning('Action selector found no nodes.');
        }
        for (var i=0; i < nodes.length; i++) {
            this.node = nodes[i];
            //XXX error handling for wrong command name
            var msg = '[' + name + '] action executes on target (' + (i+1);
            msg += '/' + nodes.length +  ') ';
            msg += '[' + nodetext(this.node) + '].';
            kukit.logDebug(msg);
            executeActions(this);
        }
    } else {
        // single node
        var msg = '[' + name + '] action executes on single node ';
        msg += '[' + nodetext(this.node) + '].';
        kukit.logDebug(msg);
        executeActions(this);
    }
};

this.executeDefaultAction = function(name, optional) {
    // Check kss action parms
    for (key in this.kssParms) {
        kukit.E = 'Wrong parameter : [' + key + '] starts with "kss";';
        kukit.E += ' normal parms (that do not start with kss)';
        kukit.E += ' only are allowed in action-default keys.';
        throw new Error(kukit.E);
    }
    //
    var namespace = this.binder.__eventNamespace__;
    var kssevent = kukit.eventsGlobalRegistry.get(namespace, name);
    var methodName = kssevent.defaultActionMethodName;
    var success = false;
    if (! methodName) {
        if (! optional) {
            kukit.E = 'Could not trigger event [' + name;
            kukit.E += '] from namespace [' + namespace + '], because this';
            kukit.E += ' event has no default method registered.';
            throw new Error(kukit.E);
        }
    } else {
        // Put defaultParameters to parms!
        // This makes sure, that for implicit events 
        // you do not need to specify pass(key)
        // for making the parms arrive to the action.
        if (typeof(this.defaultParameters) != 'undefined') {
            this.parms = this.defaultParameters;
        } else {
            this.parms = {};
        }
        this.binder.callMethod(
            namespace, name, this, methodName);
        success = true;
    }
    return success;
};

this.executeServerAction = function(name) {
    for (key in this.kssParms) {
        if (key == 'kssSubmitForm') {
            // Value has been evaluated at this point.
            var formQuery = this.kssParms[key];
            // If a string is returned: this is to support
            // kssSubmitForm: "formname";
            // in this case this is evaluated as form("formname").
            if (typeof(formQuery) == 'string') {
                var locator = new kukit.fo.NamedFormLocator(formQuery);
                var collector = new kukit.ut.TupleCollector();
                formQuery = kukit.fo.getAllFormVars(locator, collector);
            }
        } else if (key == 'kssUrl') {
            // Value will be evaluated.
        } else {
           kukit.E = 'Wrong parameter : [' + key + '] starts with "kss";';
            kukit.E += ' normal parms (that do not start with kss)';
            kukit.E += ' only are allowed in action-default keys.';
            throw new Error(kukit.E);
        }
    }
    // oper will be accessible to some commands that execute in return
    var sa = new kukit.sa.ServerAction(name, this);
};

/* Helpers the serve binding */

this.getEventName = function () {
    // Gets event name
    return this.eventRule.kssSelector.name;
};

this.getEventNamespace = function () {
    // Gets event name
    return this.eventRule.kssSelector.namespace;
};

this.hasExecuteActions = function () {
    // Decide if there are any actions (or a default action)
    // to execute. This can speed up execution if in case
    // we have nothing to do, there is no reason to bind
    // the actions hook.
    if (this.eventRule) {  
        // if it has actions, the answer is yes
        if (this.eventRule.actions.hasActions())
            return true;
        // if we have a default action, we will return true in any case
        // because we may want to call it.
        // The reason for this check is, that a default action is also
        // valid, even if it received no parms in the eventRule,
        // in which case it is not present as an action.
        var kssevent = kukit.eventsGlobalRegistry.get(
            this.getEventNamespace(), this.getEventName());
        var methodName = kssevent.defaultActionMethodName;
        return (typeof methodName != 'undefined');
    } else
        return false;
};

this.makeExecuteActionsHook = function (filter) {
    // Factory that creates the function that executes the actions.
    // The function may take a dict that is updated on the oper 
    // If filter is specified, it will we called with a function and
    // the event will only be triggered if the filter returned true.
    // THe return value of func_to_bind will show if the event
    // has executed or not.
    //
    // Speedup.
    if (! this.hasExecuteActions()) {
        return function() {};
    }
    var eventName = this.getEventName();
    var self = this;
    var func_to_bind = function(dict) {
        // (XXX XXX TODO it should happen here, that we change to a different
        // oper class. This is for the future when we separate the BindOper
        // from the ActionOper.)
        var newoper = self.clone(dict, true);
        // call the filter and if it says skip it, we are done
        // (Filter has a chance to set a defaultParameters on oper.
        if (filter && ! filter(newoper)) return false;
        // execute the event's actions
        newoper.binder.triggerEvent(eventName, newoper);
        // show that the event's actions have been executed
        return true;
    };
    return func_to_bind;
};

/* Utility for parameter checking */

this.evaluateParameters =
    function(mandatory, defaults, errname, allow_excess) {
    // Checks if mandatory params are supplied and there are no excess params
    // also fill up default values
    // Parms are cloned and returned.
    // Example: 
    // oper.evaluateParameters(['mand1', 'mand2'], {'key1': 'defval'},
    //      'event X');
    if (typeof(allow_excess) == 'undefined') {
        allow_excess = false;
    }
    var newParameters = {};
    for (var i=0; i<mandatory.length; i++) {
        var next = mandatory[i];
        if (typeof(this.parms[next]) == 'undefined') {
            kukit.E = 'Missing mandatory parameter [' + next;
            kukit.E += '] in [' + errname + '].';
            throw new Error(kukit.E);
        }
        newParameters[next] = this.parms[next];
    }
    for (var key in defaults){
        var val = this.parms[key];
        if (typeof(val) == 'undefined') {
            newParameters[key] = defaults[key];
        } else {
            newParameters[key] = val;
        }
    }
    for (var key in this.parms){
        if (typeof(newParameters[key]) == 'undefined') {
            if (allow_excess) {
                newParameters[key] = this.parms[key];
            } else {
                throw new Error('Excess parameter [' + key + '] in [' + errname + '].');
            }
        }
    }
    this.parms = newParameters;
};

this.completeParms =
    function(mandatory, defaults, errname, allow_excess) {
    var msg = 'Deprecated [Oper.completeParms],';
    msg += 'use [Oper.evaluateParameters] instead !';
    kukit.logWarning(msg);
    this.evaluateParameters(mandatory, defaults, errname, allow_excess);
};

this.evalBool = function(key, errname) {
    var value = this.parms[key];
    kukit.E = 'for key [' + key + '] in [' + errname + '].';
    this.parms[key] = kukit.ut.evalBool(value, kukit.E);
};

this.evalInt = function(key, errname) {
    var value = this.parms[key];
    kukit.E = 'for key [' + key + '] in [';
    kukit.E += errname || this.componentName + '].';
    this.parms[key] = kukit.ut.evalInt(value, kukit.E);
};

this.evalList = function(key, errname) {
    var value = this.parms[key];
    kukit.E = 'for key [' + key + '] in [';
    kukit.E += errname || this.componentName + '].';
    this.parms[key] = kukit.ut.evalList(value, kukit.E);
};

    this.debugInformation = function() {
        if (this.eventRule) {
            var eventRule = this.eventRule;
            var node = this.node;
            var nodeName = '<DOCUMENT>';
            if (node != null) {
                nodeName = node.nodeName;
            }
            var message = ', event [' + eventRule.kssSelector.name;
            message += '], rule #' + eventRule.getIndex() + ', node [';
            message += nodeName + '].'; 
            return message;
        }
        return '';
    };
this.initialize.apply(this, arguments);
};

}();                              /// MODULE END

/*
* Copyright (c) 2005-2007
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

/* Simple but effective tokenizing parser engine */


kukit.tk = new function() {   /// MODULE START

var tk = this;

/*
* class _TokenBase
*/
tk._TokenBase = function() {

this.emitError = function(msg) {
    // Use the start position of the token for the error report.
    var marker = this.cursor.makeMarker(this.startpos);
    throw kukit.err.parsingError(msg, marker);
    throw new Error(kukit.E);
};

this.updateFinished = function() {
    if (! this.finished && this.cursor.text.length == this.cursor.pos) {
        if (this.isTopLevelParser) {
            this.finished = true;
        } else {
            kukit.E = 'Unexpected EOF.';
            this.emitError(kukit.E);
        };
    };
};

};


/*
* class _ParserBase
*/
tk._ParserBase = function() {

// Provide an empty initialize. This allows
// that the tokens will inherit it and are
// not forced to implement it themselves.
this.initialize = function() {
};

this.emitAndReturn = function(token) {
    // handle return to the next level
    this.finished = true;
    return token;
};

this.nextStep = function() {
    var table = this.table;
    var cursor = this.cursor;
    // Search for symbol according to table.
    var best_pos = cursor.text.length;
    var best_symbol = null;
    for (var symbol in table) {
        var pos = cursor.text.indexOf(symbol, cursor.pos);
        if (pos != -1 && pos < best_pos) {
            best_pos = pos;
            best_symbol = symbol;
        };
    };
    // eat up till the symbol found (of EOF)
    if (best_pos > cursor.pos) {
        this.result.push(new tk.Fraction(cursor, best_pos));
        cursor.pos = best_pos;
    };
    if (best_symbol) {
        // found a symbol, handle that
        // make the token and push it
        var tokens = table[best_symbol].call(this);
        if (typeof(tokens) != 'undefined') {
            if (typeof(tokens.length) == 'undefined') {
                tokens = [tokens];
            };
            for (var i=0; i<tokens.length; i++) {
                this.result.push(tokens[i]);
            };
        };
    };
};

/* token postprocess support */

this.process = function() {
    // default process after tokenization
    this.txt = '';
    for (var i=0; i<this.result.length; i++) {
        this.txt += this.result[i].txt;
    }
};

this.expectToken = function(context, token) {
    var i = context.nextTokenIndex;
    if (token) {
        var symbol = token.prototype.symbol;
        if (i >= this.result.length) {
            kukit.E = 'Missing token : [' + symbol + '].';
            this.emitError(kukit.E);
        } else if (this.result[i].symbol != symbol) {
            kukit.E = 'Unexpected token : [' + this.result[i].symbol;
            kukit.E += '] found, [' + symbol + '] was expected.';
            this.emitError(kukit.E);
        }
    } else {
        if (i >= this.result.length) {
            kukit.E = 'Missing token.';
            this.emitError(kukit.E);
        }
    }
    context.token = this.result[i];
    context.nextTokenIndex += 1;
};

this.resultIsNullOrNotToken = 
    function(token, currentValue) {
    return (!token || currentValue.symbol != token.prototype.symbol);
};

this.notInTokens = 
    function(context, token1, token2, token3, token4) {
    var i = context.nextTokenIndex;
    var currentValue = this.result[i];
    return !(
        (i >= this.result.length) ||
        (this.resultIsNullOrNotToken(token1, currentValue) &&
        this.resultIsNullOrNotToken(token2, currentValue) &&
        this.resultIsNullOrNotToken(token3, currentValue) &&
        this.resultIsNullOrNotToken(token4, currentValue))
        );
};

this.digestTxt =
    function(context, token1, token2, token3, token4) {
    // digests the txt from the tokens, ignores given token
    // plus whitespace removal
    this.digestExactTxt(context, token1, token2, token3, token4);
    context.txt = this.removeWhitespacesAndTrim(context.txt);
};

this.digestExactTxt =
    function(context, token1, token2, token3, token4) {
    // digests the txt from the tokens, ignores given token
    // exact value: no whitespace removal
    var result = '';
    while (this.notInTokens(context, token1, token2, token3, token4)) {
        result += this.result[context.nextTokenIndex].txt;
        context.nextTokenIndex ++;
        }
    context.txt = result;
};

this.removeWhitespaces = function(txt) {
    // removes ws but leaves leading and trailing one
    if (txt != ' ') { //speedup only
        txt = txt.replace(/[\r\n\t ]+/g, ' ');
    }
    return txt;
};
    
this.removeWhitespacesAndTrim = function(txt) {
    txt = this.removeWhitespaces(txt);
    // XXX Strange thing is: following replace works from
    // tests and the original demo, but with kukitportlet demo
    // it breaks. Someone stinks!
    //txt = txt.replace(/^ /, '');
    if (txt && txt.charAt(0) == ' ') {
        txt = txt.substr(1);
    }
    txt = txt.replace(/ $/, '');
    return txt;
};

};

tk._ParserBase.prototype = new tk._TokenBase();

/*
* class Fraction
*/
tk.Fraction = function() {

this.initialize = function(cursor, endpos) {
    this.txt = cursor.text.substring(cursor.pos, endpos);
    this.startpos = cursor.pos;
    this.endpos = cursor.pos;
    this.finished = true;
};
this.initialize.apply(this, arguments);
};
tk.Fraction.prototype.symbol = 'fraction';


/* Factories to make tokens and parsers */

tk.mkToken = function(symbol, txt) {
    // Poor man's subclassing.
    f = function(cursor) {
        this.cursor = cursor;
        this.startpos = cursor.pos;
        if (cursor.text.substr(cursor.pos, txt.length) != txt) {
            kukit.E = 'Unexpected token : [';
            kukit.E += cursor.text.substr(cursor.pos, txt.length) + '] found,';
            kukit.E += ' [' + txt + '] was expected.';
            this.emitError(kukit.E);
        } else {
            cursor.pos += txt.length;
            this.finished = true;
        }
        this.endpos = cursor.pos;
        //this.cursor = null;
    };
    f.prototype = new tk._TokenBase();
    f.prototype.symbol = symbol;
    f.prototype.txt = txt;
    return f;
};

tk.mkParser = function(symbol, table, _class) {
    // Poor man's subclassing.
    f = function(cursor, tokenClass, isTopLevelParser) {
        this.table = table;
        this.cursor = cursor;
        this.startpos = cursor.pos;
        this.finished = false;
        this.isTopLevelParser = isTopLevelParser;
        this.result = [];
        if (tokenClass) {
            // Reentry with starting token propagated.
            this.result.push(new tokenClass(this.cursor));
        }
        this.updateFinished();
        while (!this.finished) {
            this.nextStep();
            this.updateFinished();
        }
        this.endpos = cursor.pos;
        // Call initialize with the original arguments
        // (no need to call it earlier, as
        this.initialize.apply(this, arguments);
        // post processing
        this.process();
        
        //this.cursor = null;
    };
    // Extend class's prototype, instead of overwriting
    // it, since it may have its own methods!
    // This means: the parser class we create
    // double inherits from the specified parser class
    // and the paeser base.
    f.prototype = new tk._ParserBase();
    var _prototype = new _class();
    for (key in _prototype) {
        // Set the method (or attribute) on the new prototype.
        // This allows that a parser class may eventually 
        // override some methods of _ParserBase: for example,
        // process is usually overwritten.
        f.prototype[key] = _prototype[key];
    }
    // Set the symbol on the new class, too
    f.prototype.symbol = symbol;
    return f;
};

/*
* class Cursor
*/
tk.Cursor = function() {

this.initialize = function(txt) {
    this.text = txt;
    this.pos = 0;
};

this.makeMarker = function(pos) {
    // create a cursor to mark this position
    var cursor = new tk.Cursor();
    cursor.text = this.text;
    cursor.pos = pos;
    // Calculate the row and column information on the cursor
    cursor.calcRowCol();
    return cursor;
};

this.getRowCol = function(pos) {
    // Gets the row, col information for the position.
    if (typeof(pos) == 'undefined') {
        pos = this.pos;
    }
    var index = 0;
    var row = 1;
    var next = 0;
    while (true) {
        next = this.text.indexOf('\n', index);
        if (next == -1 || next >= pos) {
            break;
        }
        index = next + 1;
        row += 1;
    }
    var col = pos - index + 1;
    return {'row': row, 'col': col};
};

this.calcRowCol = function(pos) {
    // Calculates row and column information on the cursor.
    var rowcol = this.getRowCol();
    this.row = rowcol.row;
    this.col = rowcol.col;
};
this.initialize.apply(this, arguments);
};

}();                              /// MODULE END

/*
* Copyright (c) 2005-2008
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

kukit.pr = new function() {   /// MODULE START

var pr = this;

/*
*  class ValueProviderRegistry
* 
*  The parameter providers need to be registered here.
*/
pr.ValueProviderRegistry = function () {

this.initialize = function() {
    this.content = {};
};

this.register = function(name, func, returnType) {
    if (typeof(func) == 'undefined') {
        kukit.E = 'func argument is mandatory when registering a parameter'
        kukit.E += ' provider [ValueProviderRegistry.register].';
        throw new Error(kukit.E);
    }
    if (this.content[name]) {
       // Do not allow redefinition
       var msg = 'Error : parameter provider [' + name;
       msg += '] already registered.';
       kukit.logError(msg);
       return;
    }
    this.content[name] = func;
    // Handle return type
    // XXX Store it on the func's prototype.
    // This is a temporary solution, the service-layer
    // branch offers a proper way to do this.
    func.prototype.returnType = returnType;
};

this.exists = function(name) {
    var entry = this.content[name];
    return (typeof(entry) != 'undefined');
};

this.get = function(name) {
    var func = this.content[name];
    if (! func) {
        kukit.E = 'Error : undefined parameter provider [' + name + '].';
        throw new Error(kukit.E);
    }
    return func;
};
this.initialize.apply(this, arguments);
};

}();                              /// MODULE END

kukit.dummy = new function() {   /// MODULE START
/*
* Register the core parameter providers
*
* A parameter provider is a class that needs to implement the 
* check and the eval methods.
* Check is executed at parsing time, eval is doing the real job
* of providing the requested parameter result.
* Check throws an exception if the parameters are not as expected.
* The parameters are coming in the input array [args]. The current node is
* passed in [node]. The output value should be returned.
*
* There is a third parameter that contains the default parameters
* dict (for input only). This is only used by the [pass()] parameter
* provider. The default parameters are used if an action is called
* programmatically but in this case the parameters to be propagated
* must be explicitely declared using the provider [pass()].
*
* The special key '' is held for the parameter provider that just returns
* the string itself. This is by default defined as the identity function, but
* can be overwritten to do something with the string value. The usage is that
* this provider expects a single parameter, the string.
*/

/*
*  class _IdentityPP
*/
var _IdentityPP = function() {

this.check = function(args) {
    // check does not need to be used here actually.
    if (args.length != 1) {
        throw new Error('internal error, _IdentityPP needs 1 argument');
    }
};

this.eval = function(args, node) {
    return args[0];
};

};

/*
*  class _FormVarPP
*/
var _FormVarPP = function() {

this.check = function(args) {
    if (args.length != 2) {
        throw new Error('formVar method needs 2 arguments [formname, varname]');
    }
};

this.eval = function(args, node) {
    return kukit.fo.getFormVar(new kukit.fo.NamedFormLocator(args[0]), args[1]);
};

};

/*
*  class _CurrentFormPP
*/
var _CurrentFormVarPP = function() {

this.check = function(args) {
    if (args.length != 0 && args.length != 1) {
        throw new Error('currentFormVar method needs 0 or 1 argument [varname]');
    }
};

this.eval = function(args, node) {
    if (args.length == 1) {
        return kukit.fo.getFormVar(new kukit.fo.CurrentFormLocator(node),
            args[0]);
    } else {
        // no form var name, just get the value of the node.
        return kukit.fo.getValueOfFormElement(node);
    }
};

};

/*
*  class _CurrentFormVarFromKssAttrPP
*/
var _CurrentFormVarFromKssAttrPP = function() {

this.check = function(args) {
    if (args.length != 1 && args.length != 2) {
        kukit.E = 'currentFormVarFromKssAttr method needs 1 or 2 argument';
        kukit.E += ' [attrname, [recurseParents]]';
        throw new Error(kukit.E);
    }
};

this.eval = function(args, node) {
    var argname =  args[0];
    var recurseParents = false;
    if (args.length == 2) {
        kukit.E = '2nd attribute of currentFormVarForKssAttr must be a';
        kukit.E += ' boolean';
        recurseParents = kukit.ut.evalBool(args[1], kukit.E);
    }
    var formvarname = kukit.dom.getRecursiveAttribute(node, argname,
        recurseParents, kukit.dom.getKssAttribute);
    return kukit.fo.getFormVar(new kukit.fo.CurrentFormLocator(node),
        formvarname);
};

};


/*
*  class _NodeAttrPP
*/
var _NodeAttrPP = function() {

this.check = function(args) {
    if (args.length != 1 && args.length != 2) {
        kukit.E = 'nodeAttr method needs 1 or 2 argument (attrname,';
        kukit.E += ' [recurseParents]).';
        throw new Error(kukit.E);
    }
};

this.eval = function(args, node) {
    var argname = args[0];
    if (argname.toLowerCase() == 'style') {
        throw new Error('nodeAttr method does not accept [style] as attrname.');
    }
    if (argname.match(/[ ]/)) {
        throw new Error('attrname parameter in nodeAttr method cannot contain space.');
    }
};

this.eval = function(args, node) {
    var argname = args[0];
    var recurseParents = false;
    if (args.length == 2) {
        recurseParents = args[1];
        kukit.E = '2nd attribute of nodeAttr must be a boolean.';
        recurseParents = kukit.ut.evalBool(recurseParents, kukit.E);
    }
    return kukit.dom.getRecursiveAttribute(node, argname, recurseParents,
        kukit.dom.getAttribute);
};

};

/*
*  class _KssAttrPP
*/
var _KssAttrPP = function() {

this.check = function(args) {
    // Uncomment next part to activate BBB:
    //kukit.E = 'kssAttr is deprecated and will be removed at ';
    //kukit.E += '2008-XX-XX';
    //kukit.E += ', use kssValue. Change your html ';
    //kukit.E += 'class markup from kssattr-key-value to ';
    //kukit.E += 'kss-attr-key-value, ';
    //kukit.E += 'and change the provider from kssAttr(key, true) to ';
    //kukit.E += 'kssValue(attr, key). Note that kssValue has a third ';
    //kukit.E += 'parameter to enable/disable recursion, but in contrary ';
    //kukit.E += 'to kssAttr, kssValue has recursion by default enabled ';
    //kukit.E += '(true).';
    //kukit.logWarning(kukit.E);
    if (args.length != 1 && args.length != 2) {
        kukit.E = 'kssAttr method needs 1 or 2 argument (attrname,';
        kukit.E += ' [recurseParents]).';
        throw new Error(kukit.E);
    }
};

this.eval = function(args, node) {
    var argname =  args[0];
    var recurseParents = false;
    if (argname.match(/[ -]/)) {
        kukit.E = 'attrname parameter in kssAttr method cannot contain';
        kukit.E += ' dashes or spaces.';
        throw new Error(kukit.E);
    }
};

this.eval = function(args, node) {
    var argname =  args[0];
    var recurseParents = false;
    if (args.length == 2) {
        recurseParents = args[1];
        kukit.E = '2nd attribute of kssAttr must be a boolean.';
        recurseParents = kukit.ut.evalBool(recurseParents, kukit.E);
    }
    return kukit.dom.getRecursiveAttribute(node, argname, recurseParents,
        kukit.dom.getKssAttribute);
};

};

/*
*  class _NodeContentPP
*/
var _NodeContentPP = function() {

this.check = function(args) {
    if (args.length != 0 && args.length != 1) {
        throw new Error('nodeContent method needs 0 or 1 argument [recursive].');
    }
};

this.eval = function(args, node) {
    var recursive = false;
    if (args.length == 1) {
        recursive = args[0];
    }
    return kukit.dom.textContent(node, recursive);
};

};

/*
*  class _StateVarPP
*/
var _StateVarPP = function() {

this.check = function(args) {
    if (args.length != 1) {
        throw new Error('stateVar method needs 1 argument [varname].');
    }
};

this.eval = function(args, node) {
    var key = args[0];
    var value = kukit.engine.stateVariables[key];
    if (typeof(value) == 'undefined') {
        // notfound arguments will get null
        kukit.E = 'Nonexistent statevar ['+ key +'].';
        throw new Error(kukit.E);
    }
    return value;
};

};

/*
*  class _PassPP
*/
var _PassPP = function() {

this.check = function(args) {
    if (args.length != 1) {
        throw new Error('pass method needs 1 argument [attrname].');
    }
};

this.eval = function(args, node, defaultParameters) {
    var key = args[0];
    var value = defaultParameters[key];
    if (typeof(value) == 'undefined') {
        // notfound arguments will get null
        kukit.E = 'Nonexistent default parm ['+ key +'].';
        throw new Error(kukit.E);
    }
    return value;
};

};


/* The url() provider just passes the parameter, and is used to have
 * a different return type. It can be used in the line of action-server.
 * as an alternative to a separate kssUrl line.
 */
var _UrlPP = function() {
    this.check = function(args) {
        if (args.length != 1) {
            throw new Error('url() needs 1 argument');
        }
    };
};
_UrlPP.prototype = new _IdentityPP();


/* The alias() provider just passes the parameter, and is used to have
 * a different return type. It can be used in the line of action-client.
 */
var _AliasPP = function() {
    this.check = function(args) {
        if (args.length != 1) {
            throw new Error('alias() needs 1 argument');
        }
        if (args[0].isMethod) {
            kukit.E = 'Value providers are not ';
            kukit.E += 'allowed as argument for ';
            kukit.E += 'alias(), [' + args[0].methodName + '] found.';
            throw new Error(kukit.E);
        }
    };
};
_AliasPP.prototype = new _IdentityPP();


kukit.pprovidersGlobalRegistry = new kukit.pr.ValueProviderRegistry();

kukit.pprovidersGlobalRegistry.register('', _IdentityPP);
kukit.pprovidersGlobalRegistry.register('currentFormVar',
    _CurrentFormVarPP);
kukit.pprovidersGlobalRegistry.register('currentFormVarFromKssAttr',
    _CurrentFormVarFromKssAttrPP);
kukit.pprovidersGlobalRegistry.register('formVar', _FormVarPP);
kukit.pprovidersGlobalRegistry.register('kssAttr', _KssAttrPP);
kukit.pprovidersGlobalRegistry.register('stateVar', _StateVarPP);
kukit.pprovidersGlobalRegistry.register('pass', _PassPP);
kukit.pprovidersGlobalRegistry.register('nodeContent', _NodeContentPP);
kukit.pprovidersGlobalRegistry.register('nodeAttr', _NodeAttrPP);
// returnType = 'url'
kukit.pprovidersGlobalRegistry.register('url', _UrlPP, 'url');
// returnType = 'alias'
kukit.pprovidersGlobalRegistry.register('alias', _AliasPP, 'alias');

}();                              /// MODULE END



/*
* Copyright (c) 2005-2008
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

/* Supplemental data that the parser builds up */

kukit.rd = new function() {   /// MODULE START

var rd = this;

/*
*  class KssSelector
*/
rd.KssSelector = function() {

this.initialize = function(isEvent, css, name, namespace, id, ppid) {
    this.isEventSelector = isEvent;
    this.isMethodSelector = ! isEvent;
// XXX GC row and column are wrong...
// XXX move parsing errors to parser
    if (! name) {
        var msg = 'Kss selector must have a name.';
        throw kukit.err.kssSelectorError(msg);
    }
    if (name.indexOf('@') != -1) {
        var msg = 'Kss selector name must not contain @: [' + name + '].';
        throw kukit.err.kssSelectorError(msg);
        }
    if (id && id.indexOf('@') != -1) {
        var msg = 'Kss selector id must not contain @: [' + id + '].';
        throw kukit.err.kssSelectorError(msg);
        }
    if (namespace && namespace.indexOf('@') != -1) {
        var msg = 'Kss selector namespace must not contain @: [' + namespace;
        msg = msg + '].';
        throw kukit.err.kssSelectorError(msg);
       }
    if (! isEvent) {
        // method rule
        if (css != 'document' && css != 'behaviour') {
            var msg = 'KssSpecialSelector [' + name;
            msg = msg + '] must have one of the allowed names.';
            throw kukit.err.kssSelectorError(msg);
       }
        if (ppid) {
            var msg = 'KssSpecialSelector [' + name + '] must not stand ';
            msg += 'with an event id acquired by parameter provider ['
            msg += ppid.methodName +  ']';
            throw new kukit.err.KssSelectorError(msg);
        }
    }
    this.css = css;
    this.name = name;
    this.namespace = namespace;
    this.className = null;
    this.id = id;
    this.ppid = ppid;
    // finish up the KSS on it
    // XXX This disables testing the parser
    // without a plugin registry, since it needs access to the registry.
    this.setClassName();
};
    
// finish up the KSS on it
this.setClassName = function() {
    // Sets up id and class on the selector, based on registration info
    // XXX GC instead of relying on exceptions, test if key exists
    try {
        this.className = kukit.eventsGlobalRegistry.get(
        this.namespace, this.name).className;
    } catch(e) {
        throw kukit.err.parsingError(e.message);
    }
};

this.prepareId = function() {
    if (this.ppid == null) {
        if (this.id == null && this.ppid == null) {
            // singleton for class
            this.id = kukit.er.makeId(this.namespace, this.className);
        }
        // Also set the merge id. The rules with the same merge
        // id should be merged on the same node.
        this.mergeId = kukit.er.makeMergeId(this.id, this.namespace, this.name);
    }
};

this.getId = function(node) {
    // Gives the id depending on a node.
     if (this.id) {
        // Statically set.
        return this.id;
    } else {
        // Evaluate it.
        var id = this.ppid.pprovider.eval(this.ppid.args, node, {});
        // check that the id is not empty or null!
        if (! id) {
            var namestr;
            if (this.namespace) {
               namestr = this.namespace + '-' + this.name;
            } else {
               namestr = this.name;
            }
            kukit.E = 'Did not get a valid state id, when evaluated';
            kukit.E += ' the value provider [' + this.ppid.methodName + ']';
            kukit.E += ' in kss selector [' + namestr + ']';
            kukit.E += ' css=[' + this.css + ']';
            throw kukit.E;
        }
        return id;
    }
};

this.getMergeId = function(node) {
    // Gives the merge id depending on a node.
    if (this.mergeId) {
        // Statically set.
        return this.mergeId;
    } else {
        // Evaluate it.
        var id = this.getId(node);
        this.mergeId = kukit.er.makeMergeId(id, this.namespace, this.name);
    }
};
this.initialize.apply(this, arguments);
};

/*
* Kss parameter values. There are two kinds: text and method.
*
* They are evaluated in two phases: check is invoked at parsing,
* allowing the early detection of errors. Evaluate is called
* when the action is to be called. This allows a kss method
* to add any parameter to the action.
*/

/*
*  class KssTextValue
*/
rd.KssTextValue = function(txt) {
    // A text parameter in the format 
    //      key: value;
this.initialize = function(txt) {    
    this.txt = txt;
};

this.check = function(registry) {
    // use the IdentityPP provider.
    this.pprovider = new (kukit.pprovidersGlobalRegistry.get(''))();
};

this.evaluate =
    function(node, defaultParameters) {
    // For normal string parms, this would return the string itself.
    // In other execution contexts (like kssSelector, for example) this can
    // do something else.
    return this.pprovider.eval([this.txt], node, defaultParameters);
};
this.initialize.apply(this, arguments);
};
rd.KssTextValue.prototype.isMethod = false;

/*
*  class KssMethodValue
*/
rd.KssMethodValue = function() {

this.initialize = function(methodName, args) {
    // A method parameter in the format 
    //      key: methodName(v1, v2, ... vn);
    this.methodName = methodName;
    this.args = args;
};

this.check = function(registry) {
    // Check syntax
    var f = kukit.pprovidersGlobalRegistry.get(this.methodName);
    this.pprovider = new f();
    //Check the provider first.
    this.pprovider.check(this.args);
    // After checking the provider, we check the args recursively.
    for(var i=0; i < this.args.length; i++){
        // XXX We treat text values separetly because
        // they are now currently wrapped as KssTextValue
        // (as they should). TODO
        var arg = this.args[i];
        // XXX this is a check for a MethodValue, since
        // all text arguments are strings. -- this is fixed
        // on the service-layer branch
        if(arg.check){
            arg.check();
            // The page provider should have checked if the parameters
            // return the appropriate value type. If it has done
            // this check, it has set checkedArgTypes. 
            // If a provider expects all strings
            // (like most value providers), it simply leaves this flag 
            // intact, and we do the check here.
            if (! this.pprovider.checkedArgTypes) {
                // We expect a string to each position.
                // By default, returnType is "string" so we also
                // check undefined.
                var returnType = arg.pprovider.returnType;
                if (returnType && returnType != 'string') {
                    kukit.E = 'Expected string value and got [' + returnType;
                    kukit.E += '] in argument #[' + (i + 1) + '] of provider [';
                    kukit.E += this.methodName + '].';
                    throw new Error(kukit.E);
                }
            }

        }
    }
};

this.evaluate =
    function(node, defaultParameters) {
    // First recursivly evaluate all arguments
    var newArgs = [];
    for(var i=0; i < this.args.length; i++){
        // XXX We treat text values separetly because
        // they are now currently wrapped as KssTextValue
        // (as they should). TODO
        var arg = this.args[i];
        if(arg.evaluate){
            newArgs.push(arg.evaluate(node, defaultParameters));
        } else {
            newArgs.push(arg);
        }
    }
    // return the value
    return this.pprovider.eval(newArgs, node, defaultParameters);
};
this.initialize.apply(this, arguments);
};
rd.KssMethodValue.prototype.isMethod = true;


/*
*  class KssEventValue
*/
rd.KssEventValue = function(methodName, arg) {
    // A method parameter in the format 
    //      methodname(v1)
    // can be also:
    //      methodname(methodname2(v2))
    //  in both cases, arg is KssTextValue, or KssMethodValue
    this.methodName = methodName;
    this.arg = arg;
    this.check = function() {};
};
rd.KssEventValue.prototype.isMethod = true;

rd.EventRuleNr = 0;            // just a counter

/*
*  class EventRule
*/
rd.EventRule = function() {

this.initialize = function(kssSelector, parms, actions) {
    if (typeof(parms) == 'undefined') {
        // called for merging clone
        // Setting up kssSelector is enough here. Parms and the rest
        // are not needed, since the merging code will attach them
        // on the rule after creation.
        this.kssSelector = kssSelector;
    } else {
        this.index = rd.EventRuleNr;
        this.mergedIndex = null;
        rd.EventRuleNr = this.index + 1;
        var namestr;
        if (kssSelector.namespace) {
            namestr = kssSelector.namespace + '-' + kssSelector.name;
        } else {
            namestr = kssSelector.name;
        }
        var msg = 'EventRule #' + this.getIndex() + ': ';
        msg = msg + kssSelector.css + ' EVENT=' + namestr;
        kukit.logDebug(msg);
        this.kssSelector = kssSelector;
        this.parms = parms;
        this.actions = actions;
    }
};

this.getIndex = function() {
    if (this.mergedIndex) {
        return this.mergedIndex;
    } else {
        return this.index;
    }
};

this.mergeForSelectedNodes = 
    function(ruletable, phase, inNodes) {

    // Select all nodes within the inNodes for phase==2.
    // (or undefined on initial node, phase==1)
    // Merge itself to the selected nodes.
    if (this.kssSelector.isEventSelector) {
        var nodes = kukit.dom.cssQuery(this.kssSelector.css, inNodes);
        var counter = 0;
        for (var y=0; y < nodes.length; y++)
        {
            var node = nodes[y];
            // XXX never rebind to any node again!
            // this compensates that cssQuery is returning
            // results out of the subtree
            if (typeof(node._kukitMark) == 'undefined') {
                ruletable.add(node, this);
                counter += 1;
                }
        }
        if (counter > 0) {
            var msg = 'EventRule [#' + this.getIndex();
            msg = msg + '-' + this.kssSelector.mergeId;
            msg = msg + '] selected ' + counter + ' nodes.';
            kukit.logDebug(msg);
        }
    } else if (typeof(inNodes) == 'undefined') {
        // Method selector. They only need to be handled on the initial
        // pageload, when the inNodes parameter is ommitted.
        kukit.engine.documentRules.add(this);
    }
};

this.getBinderInfo = function(node) {
    // Figure out what will be the "state id" for the kss event rule.
    var id = this.kssSelector.getId(node);
    // Gets the event instance for the rule.
    return kukit.engine.binderInfoRegistry.getOrCreateBinderInfo(
        this.kssSelector.id, this.kssSelector.className, 
        this.kssSelector.namespace);
};

/*
* bind(node) : calls binder hook on event instance.
*  These hooks are tried in order, if succeeds it must return true:
*
* __bind__(name, parms, func_to_bind, node, eventRule)
* __bind_<name>__(parms, func_to_bind, node, eventRule)
*
* If none succeeds is an error.
*
*/

this.bind = function(node) {
    this.store(node);
    // Creation of the binding oper
    var oper = new kukit.op.Oper();
    var binderInfo = this.getBinderInfo(node);
    oper.node = node;
    oper.eventRule = this;
    oper.binder = binderInfo.binder;
    oper.parms = this.parms;
    // mark on the instance as bound
    binderInfo.bindOper(oper); 
};

this.store = function(node) {
    if (node == null) {
        // node == null is *always* valid, it means "document".
        return;
    }
    if (typeof(node.kukitEventRules) == 'undefined') {
        var rules = [];
        node.kukitEventRules = rules;
    }
    node.kukitEventRules.push(this);
};
/*
* Merging event rules
*/

this.isMerged = function() {
    return (this.mergedIndex != null);
};

this.cloneForMerge = function() {
    // Do not touch ourselves, make a new copy for the merge.
    var merged = new rd.EventRule(this.kssSelector);
    merged.actions = new rd.ActionSet();
    merged.parms = {};
    merged.mergedIndex = 'X';
    merged.merge(this);
    merged.mergedIndex = this.getIndex();
    return merged;
};

this.merge = function(other) {
    if (! this.isMerged()) {
        throw new Error('Cannot merge into a genuine event rule');
    }
    if (this.kssSelector.isEventSelector) {
        if (this.kssSelector.id != other.kssSelector.id) {
            throw new Error('Differing kss selector ids in event rule merge');
        }
        if (this.kssSelector.className != other.kssSelector.className) {
            throw new Error('Differing kss selector classes in event rule merge');
        }
    }
    if (this.kssSelector.name != other.kssSelector.name) {
        throw new Error('Differing kss selector names in event rule merge');
    }
    this.mergedIndex = this.mergedIndex + ',' + other.getIndex();
    for (var key in other.parms) {
        this.parms[key] = other.parms[key];
    }
    this.actions.merge(other.actions);
    if (this.mergedIndex.substr(0, 1) != 'X') {
        // ignore initial clone-merge
        var msg = 'Merged rule [' + this.mergedIndex;
        msg = msg + '-' + this.kssSelector.mergeId + '].';
        kukit.logDebug(msg);
    }
};

this.mergeIntoDict = function(dict, key) {
    // Merge into the given dictionary by given key.
    // If possible, store the genuine rule first - if not,
    // clone it and do a merge. Never destroy the genuine
    // rules, clone first. This is for efficiency.
    var mergedRule = dict[key];
    if (typeof(mergedRule) == 'undefined') {
        // there was no rule
        dict[key] = this;
    } else {
        // we have to merge the rule
        if (! mergedRule.isMerged()) {
            // Make sure genuine instances are replaced
            mergedRule = mergedRule.cloneForMerge();
            dict[key] = mergedRule;
        }
        mergedRule.merge(this);
    }
};
this.initialize.apply(this, arguments);
};


/*
*  class ActionSet
*/
rd.ActionSet = function() {

this.initialize = function() {
    this.content = {};
};

this.hasActions = function() {
    for (var name in this.content) {
        return true;
    }
    return false;
};

this.merge = function(other) {
    for (var key in other.content) {
        var action = this.content[key];
        var action2 = other.content[key];
        if (typeof(action) == 'undefined') {
            if (action2.type != 'X') {
                // new action
                action = new _Action();
                this.content[key] = action;
            } else {
                var msg = 'Cannot action-delete unexisting action, [';
                msg = msg + key + '].';
                // Double throw in this case is needed, in production mode
                // only the second one will be effective.
                throw kukit.err.ruleMergeError(msg);
                throw new Error(kukit.E);
            }
        }
        if (action2.type != 'X') {
            // merge the action
            action.merge(action2);
        } else {
            // Delete the action
            this.deleteAction(key);
        }
    }
};

this.execute = function(oper) {
    for (var key in this.content) {
        var action = this.content[key];
        // do not execute error actions!
        if (action.type != 'E') {
            action.execute(oper);
        }
    }
    // Execute the default action in case of there is one but there were no
    // parms so it was actually not entered as an action object
    // otherwise, it would have been executed from action.execute already
    if (typeof(this.content['default']) == 'undefined') {
        // this is conditional: if there is no default method, it's skipped.
        var name = oper.eventRule.kssSelector.name;
        // Execution with no parms. (XXX ?)
        oper = oper.clone({'parms': {}});
        oper.executeDefaultAction(name, true);
    }
};

this.getOrCreateAction = function(name, valuesByReturnType) {
    // kss parameters will ve set from valuesByReturnType 
    //
    // In case we alias, use the alias for name, this will become
    // the action name used for execution. The alias name will
    // be used as name, and serve for decide merging.
    var nameOverride;
    if (valuesByReturnType.alias) {
        nameOverride = name;
        // This is always a string, no provider allowed.
        // 
        // XXX atm, strings are unwrapped. (this is fixed
        // in service-layer branch)
        name = valuesByReturnType.alias.args[0];
    }
    // Check if we have this action already
    var action = this.content[name];
    if (typeof(action) == 'undefined') {
        action = new _Action();
        action.setName(name, nameOverride);
        this.content[name] = action;
    }
    // Set other values that were given at the same line as the name.
    // This enables individual overriding.
    if (valuesByReturnType.selection) {
        action.parms.kssSelector = valuesByReturnType.selection;
    }
    if (valuesByReturnType.formquery) {
        action.parms.kssSubmitForm = valuesByReturnType.formquery;
    }
    if (valuesByReturnType.url) {
        action.parms.kssUrl = valuesByReturnType.url;
    }
    return action;
};

this.getActionOrNull = function(name) {
    var action = this.content[name];
    if (typeof(action) == 'undefined') {
        action = null;
    }
    return action;
};

this.deleteAction = function(name) {
    var action = this.content[name];
    if (typeof(action) == 'undefined') {
        throw new Error('Action [' + name + '] does not exist and cannot be deleted.');
    }
    delete this.content[name];

};

this.getDefaultAction = function() {
    return this.getActionOrNull('default');
};

this.getErrorActionFor = function(action) {
    // Get the error action of a given action: or null,
    // if the action does not define an error handler.
    return this.getActionOrNull(action.error);
};
this.initialize.apply(this, arguments);
};

/*
*  class _Action
*/
var _Action = function() {

this.initialize = function() {
    this.name = null;
    this.error = null;
    this.parms = {};
    this.type = null;
    this.nameOverride = null;
};

this.getExecutingName = function getExecutingName() {
    // Returns action name that is to be used for execution.
    // In case nameOverride is empty, name is used both as merging
    // key, and for selecting the action at execution.
    // In case nameOverride is specified, name is still used for
    // merging, but nameOverride is used when we need to
    // execute the action.
    // This is used for  action-client: nameOverride alias(name).
    return this.nameOverride || this.name;
};

this.setName = function(name, nameOverride) {
    if (typeof(nameOverride) == 'undefined' || name == nameOverride) {
        // use null for no-value.
        //
        // Also: If we alias to the same name as the action name,
        // simply ignore aliasing and just handle the real action.
        nameOverride = null;
    }
    // We check that the name did not change.
    if (this.name != null) {
        if (this.name != name) {
            kukit.E = 'Error overriding action name [' + this.name;
            kukit.E += '] to [' + name + '] (Unmatching action names or aliases at merge?)';
            throw kukit.err.ruleMergeError(kukit.E);
        }
        // nameOverride can only be specified when name is also specified.
        // We also check that the override cannot change, ie. it is not
        // possible to use the same alias for different actions.
        // However we allow this.nameOverride to have a value and nameOverride
        // to be null.
        if (nameOverride != null && this.nameOverride != nameOverride) {
            kukit.E = 'Error overriding action name for alias [' + this.name;
            kukit.E += '] from [' + this.nameOverride;
            kukit.E += '] to [' + nameOverride + '] ';
            kukit.E += '(Different actions aliased by the same alias?)';
            throw kukit.err.ruleMergeError(kukit.E);
        }
    }
    // Store the values.
    this.name = name;
    // nameOverride is only overwritten if value exists.
    if (nameOverride != null) {
        this.nameOverride = nameOverride;
    }
    // Handle default action.
    if (name == 'default') {
        if (this.type != null && this.type != 'D') {
            var msg = 'Error setting action to default on action [' + this.name;
            msg = msg + '], current type [' + this.type + '].';
            throw kukit.err.ruleMergeError(msg);
        }
        this.setType('D');
    }
};

this.setType = function(type) {
    // Allowed types:
    //
    // S = server
    // C = client
    // E = error / client
    // D = default (unsettable)
    // X = cancel action
    var checkType = function(type) {
        var isNotServer = type != 'S';
        var isNotClient = type != 'C';
        var isNotError = type != 'E';
        var isNotCancel = type != 'X';
        return isNotServer && isNotClient && isNotError && isNotCancel;
    };
    if (checkType(type) || (this.type != null && this.type != type)) {
        var msg = 'Error setting action type on action [' + this.name;
        msg = msg + '] from [' + this.type + '] to [' + type;
        msg = msg + '] (Attempt to merge client, server or error actions ?)';
        throw kukit.err.ruleMergeError(msg);
    }
    if (this.error != null && this.type != 'S') {
        var msg = 'Error setting action error handler on action [' + this.name;
        msg = msg + '], this is only allowed on server actions.';
        throw kukit.err.ruleMergeError(msg);
    }
    this.type = type;  
};

this.setError = function(error) {
    if (this.type != null && this.type != 'S') {
        var msg = 'Error setting action error handler on action [' + this.name;
        msg =  msg + '], this is only allowed on server actions.';
        throw kukit.err.ruleMergeError(msg);
    }
    this.error = error;  
};

this.merge = function(other) {
    // Merge to the instance.
    if (other.name != null) { 
        // We also use nameOverride from the other.
        this.setName(other.name, other.nameOverride);
    }
    if (other.type != null) { 
        this.setType(other.type);
    }
    if (other.error != null) { 
        this.setError(other.error);
    }
    // These are simply overwritten.
    for (var key in other.parms) {
        this.parms[key] = other.parms[key];
    }
};

// The evaluation of string is handled specially
// in case of some parameter names.
//
//     kssSelector    string "foo" evaluates as css("foo")
//     kssSubmitForm  string "foo" evaluates as form("foo")
//
var _defaultStringHandling = {
    'kssSelector': 'css',
    'kssSubmitForm': 'form'
};

this.makeActionOper = function(oper) {
    // Fill the completed action parms, based on the node
    // The kssXxx parms, reserved for the action, are 
    // handled as appropriate.
    // A cloned oper is returned.
    var parms = {};
    var kssParms = {};
    // Make sure we have defaultParameters on oper
    if (typeof(oper.defaultParameters) == 'undefined') {
        oper.defaultParameters = {};
    }
    // Evaluate all parameters.
    for (var key in this.parms) {
        // Evaluate the value of the parameter.
        var value = this.parms[key].evaluate(oper.node,
                oper.defaultParameters);
        // Final handling of special cases.
        // This is needed in case we have a string, and we
        // look up the provider we need from the _defaultStringHandling table.
        var providerName = _defaultStringHandling[key];
        if (providerName && typeof(value) == 'string') {
            // Use the value provider. This means the string is
            // a shortcut and this provider is applied.
            var providerClass = kukit.pprovidersGlobalRegistry.get(providerName);
            var provider = new providerClass();
            // check is not needed now... we evaluate it right away
            value = provider.eval([value], oper.node, oper.defaultParameters);
        }
        // Store it, depending if it's a kss or normal parameter.
        if (key.match(/^kss/)) {
            // kssXxx parms are separated to kssParms.
            kssParms[key] = value; 
        } else {
            // evaluate the method parms into parms
            parms[key] = value;
        }
    }
    var anOper = oper.clone({
            'parms': parms,
            'kssParms': kssParms,
            'action': this
        });
    return anOper;
};

this.execute = function(oper) {
    oper = this.makeActionOper(oper);
    switch (this.type) {
        case 'D': {
            // Default action.
            var name = oper.eventRule.kssSelector.name;
            oper.executeDefaultAction(name);
        } break;
        case 'S': {
            // Server action.
            oper.executeServerAction(this.name);
        } break;
        case 'C': {
            // Client action.
            // Need to execute the real name,
            // since aliasing is possible here.
            oper.executeClientAction(this.getExecutingName());
        } break;
        case 'E': {
            // Error action (= client action)
            oper.executeClientAction(this.name);
        } break;
    }
};
this.initialize.apply(this, arguments);
};


/*
*  class LoadActions
*/
rd.LoadActions = function() {

this.initialize = function() {
    this.items = [];
};

this.empty = function() {
    return (this.size() == 0);
};

this.size = function() {
    return this.items.length;
};

this.push = function(f) {
    if (this.items.length >= 100) {
        throw ('Infinite recursion, stack full');
    }
    this.items.push(f);
};

this.execute = function() {
    var f = this.items.shift();
    if (f) {
        f();
        return true;
    } else {
        return false;
    }
};

this.executeAll = function() {
    var i = 0;
    while(true) {
        var success = this.execute();
        if (! success) {
            break;
        }
        i++;
    }
    return i;
};
this.initialize.apply(this, arguments);
};

/*
*  class RuleTable
*
*   Used for binding rules to nodes, and handling the merges.
*   It is a two level dictionary.
*
*   There are more rules that match a given node and event id. 
*   They will be merged appropriately. The event id is also
*   important. The event class must be the same with merge
*   rules (within the id).
*
*   To summarize the procedure, each eventRule is added with
*   all the nodes that are selected by it. Nothing is executed,
*   only merges are done at this time. Finally, all binds are
*   done in the second path.
*
*   Event with the same merge id are merged. The merge id is
*   a concatenation of the event id and the event name.
* 
*   XXX TODO this has to be refactored, since it's all global now
*
*/

rd.RuleTable = function() {

this.initialize = function(loadScheduler) {
    this.loadScheduler = loadScheduler;
    this.nodes = {};
};

this.add = function(node, eventRule) {
    // look up node
    var nodehash = rd.hashNode(node);
    var nodeval = this.nodes[nodehash];
    if (typeof(nodeval) == 'undefined') {
        nodeval = {'node': node, 'val': {}};
        this.nodes[nodehash] = nodeval;
    }
    // Merge into the dict
    eventRule.mergeIntoDict(
        nodeval.val, eventRule.kssSelector.getMergeId(node));
};

this.bindall = function(phase) {
    // Bind all nodes
    var counter = 0;
    for (var nodehash in this.nodes) {
        var nodeval = this.nodes[nodehash];
        // XXX Mark the node, disabling rebinding in a second round
        nodeval.node._kukitMark = phase;
        for (var id in nodeval.val) {
            var eventRule = nodeval.val[id];
            eventRule.bind(nodeval.node);
        }
        counter += 1;
    }
    kukit.logDebug(counter + ' HTML nodes bound with rules.');
    // Execute the load actions in a deferred manner
    var loadactions = this.loadScheduler;
    if (! loadactions.empty()) {
        kukit.logDebug('Delayed load actions execution starts.');
        var count = loadactions.executeAll();
        kukit.logDebug(count + ' load actions executed.');
    }
};
this.initialize.apply(this, arguments);
};

rd.uid = 0;

rd.hashNode = function(node) {
    // It is, generally, not possible to use a node as a key.
    // However we try to set this right.
    // We generate an uniqueID on the node. This does not work
    // on MSIE but it already has an uniqueID.
    if (node == null) {
        // null represents the document
        return '<<DOCUMENT>>';
    }
    var id = node.uniqueID;
    if (typeof(id) == 'undefined') {
        id = rd.uid;
        node.uniqueID = id;
        rd.uid ++;
    }
    return id;
};

/*
*  class MethodTable
*
* stores the method rules.
*
* Unlike the rule table that is specific for each binding,
* this is unique to the page.
*/
rd.MethodTable = function() {

this.initialize = function() {
    this.content = {};
    this.content['document'] = {};
    this.content['behaviour'] = {};
};

this.add = function(eventRule) {
    // Get the entry by the type which is now at css
    var category = eventRule.kssSelector.css;
    var dict = this.content[category];
    if (typeof(dict) == 'undefined') {
        throw new Error('Unknown method rule category [' + category + '].');
    }
    // Merge into the corresponding category
    // mergeId must be set on kss selector already.
    eventRule.mergeIntoDict(dict, eventRule.kssSelector.getMergeId());
};

this.getMergedRule =
    function(category, name, binder) {

    // Returns the rule for a given event instance, 
    // Get the entry by category (= document or behaviour)
    var dict = this.content[category];
    if (typeof(dict) == 'undefined') {
        throw new Error('Unknown method rule category [' + category + '].');
    }
    // look up the rule
    var namespace = binder.__eventNamespace__;
    var id = binder.__binderId__;
    var mergeId = kukit.er.makeMergeId(id, namespace, name);
    var mergedRule = dict[mergeId];
    if (typeof(mergedRule) == 'undefined') {
        // no error, just return null.
        mergedRule = null;
    }
    return mergedRule;
};

this.bindall = function() {
    // bind document events
    var documentRules = this.content['document'];
    var counter = 0;
    for (var mergeId in documentRules) {
        // bind to null as a node
        documentRules[mergeId].bind(null);
        counter += 1;
    }
    kukit.logDebug(counter + ' rules bound to document.');
};
this.initialize.apply(this, arguments);
};

}();                              /// MODULE END

/*
* Copyright (c) 2005-2008
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

/* Tokens of the KSS parser */

kukit.kssp = new function() {   /// MODULE START

var kssp = this;

/* Tokens */

kssp.openComment = kukit.tk.mkToken('openComment', "\/\*");
kssp.closeComment = kukit.tk.mkToken('closeComment', "\*\/");
kssp.openBrace = kukit.tk.mkToken('openBrace', "{");
kssp.closeBrace = kukit.tk.mkToken('closeBrace', "}");
kssp.openBracket = kukit.tk.mkToken('openBracket', "[");
kssp.closeBracket = kukit.tk.mkToken('closeBracket', "]");
kssp.openParent = kukit.tk.mkToken('openParent', "(");
kssp.closeParent = kukit.tk.mkToken('closeParent', ")");
kssp.semicolon = kukit.tk.mkToken('semicolon', ";");
kssp.colon = kukit.tk.mkToken('colon', ":");
kssp.quote = kukit.tk.mkToken('quote', "'");
kssp.dquote = kukit.tk.mkToken('dquote', '"');
kssp.backslash = kukit.tk.mkToken('backslash', '\x5c'); 
kssp.comma = kukit.tk.mkToken('comma', ",");
kssp.equals = kukit.tk.mkToken('equals', "=");

/* Parsers */

/* Helpers */

var _emitAndReturn = function() {
    return this.emitAndReturn();
};

var _mkEmitAndReturnToken = function(klass) {
    return function() {
        var token = new klass(this.cursor);
        return this.emitAndReturn(token);
    };
};

var _mkReturnToken = function(klass) {
    return function() {
        return new klass(this.cursor);
    };
};

var _returnComment = function() {
    return new kssp.Comment(this.cursor, kssp.openComment);
};

var _returnString = function() {
    return new kssp.String(this.cursor, kssp.quote);
};

var _returnString2 = function() {
    return new kssp.String2(this.cursor, kssp.dquote);
};

var _returnMethodArgs = function() {
    return new kssp.MethodArgs(this.cursor, kssp.openParent);
};

var _returnBackslashed = function() {
    return new kssp.Backslashed(this.cursor, kssp.backslash);
};

/*
* class Document 
*/
var _Document = function() {

this.process = function() {
    this.eventRules = [];
    // Parse all tokens (including first and last)
    var context = {'nextTokenIndex': 0};
    while (context.nextTokenIndex < this.result.length) {
        this.digestTxt(context, kukit.tk.Fraction, kssp.Comment);
        var key = context.txt;
        if (! key) {
            break;
        }
        this.expectToken(context, kssp.Block);
        var block = context.token;
        var rules = block.parseSelectors(key);
        this.addRules(rules);
    }
    this.result = [];
    this.txt = '';
};

this.addRules = function(rules) {
    // Create the event rules.
    for(var i=0; i<rules.length; i++) {
        this.eventRules.push(rules[i]);
    };
};

};
kssp.Document = kukit.tk.mkParser('document', {
    "\/\*": _returnComment,
    "{": function() {
             return new kssp.Block(this.cursor, kssp.openBrace)
             }
    },
    _Document
    );

/*
* class Comment 
*/
var _Comment = function() {

this.process = function() {
    this.result = [];
    this.txt = ' ';
};

};
kssp.Comment = kukit.tk.mkParser('comment', {
    // it's not 100% good, but will do
    "\*\/": _mkEmitAndReturnToken(kssp.closeComment)
    },
    _Comment
    );

/*
* class Block 
*/
var _Block = function() {

this.process = function() {
    //this.parms = {};
    this.eventFullNames = {};
    this.actions = new kukit.rd.ActionSet();
    // Parse all tokens (except first and last)
    var context = {'nextTokenIndex': 1};
    while (context.nextTokenIndex < this.result.length-1) {
        this.digestTxt(context, kukit.tk.Fraction, kssp.Comment);
        var key = context.txt;
        if (! key) {
            break;
        }
        this.expectToken(context, kssp.colon);
        this.expectToken(context, kssp.MultiPropValue);
        // store the wrapped prop
        this.addDeclaration(key, context.token.values);
        if (context.nextTokenIndex == this.result.length-1) break;
        this.expectToken(context, kssp.semicolon);
    }
    this.result = [];
    this.txt = '';
};

this.parseSelectors = function(key) {
    // Parse the part in an embedded parser
    var cursor = new kukit.tk.Cursor(key + ' ');
    var parser = new kssp.KssSelectors(cursor, null, true);
    var results = [];
    var hasFullNames = false;
    for(var eventFullName in this.eventFullNames) {
        var hasFullNames = true;
        var found = false;
        for(var i=0; i< parser.selectors.length; ++i) {
            var fullName = '';
            var kssSelector = parser.selectors[i];
            if (kssSelector.namespace) {
                fullName = kssSelector.namespace + '-';
            }
            fullName += kssSelector.name;
            if (fullName == eventFullName) {
                var eventParameters = this.eventFullNames[fullName];
                var eventRule;
                if (typeof(eventParameters)!='undefined') {
                    eventRule = new kukit.rd.EventRule(kssSelector,
                                                eventParameters, this.actions);
                }
                else{
                    eventRule = new kukit.rd.EventRule(kssSelector,
                                                {}, this.actions);
                }
                results.push(eventRule);
                found = true;
            }
        }
        if (! found){
            kukit.E = 'Wrong value for evt-[<NAMESPACE>-]<EVENTNAME> [' + eventFullName + '] : ';
            kukit.E += '<NAMESPACE>-<EVENTNAME> should exist in the event of the selectors.';
            this.emitError(kukit.E);
        }
    }
    if (! hasFullNames){
        for(var i=0; i< parser.selectors.length; ++i) {
            var kssSelector = parser.selectors[i];
            eventRule = new kukit.rd.EventRule(kssSelector,
                                               {}, this.actions);
            results.push(eventRule);
        }
    }
    return results;
};

this.addEventDeclaration = function(key, splitkey, values) {
    // evt-<EVTNAME>-<PARAMETER>: <VALUE>
    // evt-<NAMESPACE>-<EVTNAME>-<PARAMETER>: <VALUE>
    if (splitkey.length < 3) {
        kukit.E = 'Wrong rule key : "' + key + '". ';
        kukit.E += 'KSS rule key must be "<ACTIONNAME>-<PARAMETER>"';
        kukit.E += ' or "<NAMESPACE>-<ACTIONNAME>-<PARAMETER>" or ';
        kukit.E += '"evt-<EVENTNAME>-<PARAMETER>" or ';
        kukit.E += '"evt-<NAMESPACE>-<EVENTNAME>-<PARAMETER>".';
        this.emitError(kukit.E);
    }
    var eventNamespace;
    var eventName;
    var eventKey;
    var eventFullName;
    if (splitkey.length == 3) {
        // evt-<EVENTNAME>-<PARAMETER>: <VALUE>
        eventName =  splitkey[1];
        eventKey = splitkey[2];
        eventFullName = eventName;
    } else {
        // evt-<NAMESPACE>-<EVENTNAME>-<PARAMETER>: <VALUE>
        eventNamespace = splitkey[1];
        eventName = splitkey[2];
        eventKey = splitkey[3];
        eventFullName = eventNamespace + '-' + eventName;
    }
    // preprocess values
    var allowedReturnTypes;
    allowedReturnTypes = {string: true};
    kukit.E = 'event parameter [' + key + ']';
    var value = this.preprocessValues(values, allowedReturnTypes, kukit.E).string;
    if (value.isMethod != false) {
        kukit.E = 'Wrong value for key [' + key + '] : ';
        kukit.E += 'value providers are not ';
        kukit.E += 'allowed as value for ';
        kukit.E += 'evt-[<NAMESPACE>-]<EVENTNAME>-<PARAMETER> keys.';
        this.emitError(kukit.E);
    }
    var eventParameters = this.eventFullNames[eventFullName];
    if (typeof(eventParameters) == 'undefined') {
        this.eventFullNames[eventFullName] = {};
        eventParameters = this.eventFullNames[eventFullName];
    }
    eventParameters[eventKey] = value.txt;
};

this.addActionDeclaration = function(key, splitkey, values) {
    // action-server: <ACTIONNAME>
    // action-client: <ACTIONNAME>
    // action-client: <NAMESPACE>-<ACTIONNAME>
    // action-cancel: <ACTIONNAME>
    // action-cancel: <NAMESPACE>-<ACTIONNAME>
    if (splitkey.length != 2) {
        kukit.E = 'Wrong key [' + key + '] : ';
        kukit.E += 'action-<QUALIFIER> keys can have only one dash.';
        this.emitError(kukit.E);
        }
    var atab = {'server': 'S', 'client': 'C', 'cancel': 'X'};
    var actionType = atab[splitkey[1]];
    if (! actionType) {
        kukit.E = 'Wrong key [' + key + '] : ';
        kukit.E += 'qualifier in action-<QUALIFIER> keys must be ';
        kukit.E += '"server" or "client" or "cancel".'; 
        this.emitError(kukit.E);
        }    
    // preprocess values
    var allowedReturnTypes;
    if (actionType == 'S') {
        // action-server
        allowedReturnTypes = {string: true, formquery: true, url: true};
    } else if (actionType == 'C') {
        // action-client
        allowedReturnTypes = {string: true, selection: true, alias: true};
    } else {
        // action-cancel
        allowedReturnTypes = {string: true};
    }
    kukit.E = 'action definition [' + key + ']';
    var valuesByReturnType = this.preprocessValues(values, allowedReturnTypes, kukit.E);
    var value = valuesByReturnType.string;
    //
    if (value.isMethod != false) {
        kukit.E = 'Wrong value for key [' + key + '] : ';
        kukit.E += 'value providers are not ';
        kukit.E += 'allowed for action-<QUALIFIER> keys.';
        this.emitError(kukit.E);
        }
    // force value to be <ACTIONNAME> or <NAMESPACE>-<ACTIONNAME>
    var splitvalue = value.txt.split('-');
    if (splitvalue.length > 2) {
        kukit.E = 'Wrong value for key [' + key + '] : ';
        kukit.E += 'value must be <ACTIONNAME> or <NAMESPACE>';
        kukit.E += '-<ACTIONNAME> for action-<QUALIFIER> keys.';
        this.emitError(kukit.E);
    }
    // set it
    var action = this.actions.getOrCreateAction(value.txt, valuesByReturnType);
    if (actionType == 'X' &&  action.type != null) {
        // action-cancel, and the action existed already in the same block:
        // we delete it straight ahead
        this.actions.deleteAction(value.txt);
    } else {
        // any other qualifier then delete,
        // or action-cancel but there has been no action defined yet in the block:
        // set the action type.
        // (Remark: in case of action-cancel we set action's type to X, and
        // the cancellation will possibly happen later, during the merging.)
        action.setType(actionType);
    }
};

this.addActionError = function(action, key, values) {
    // <ACTIONNAME>-error: <VALUE>
    // default-error: <VALUE>
    //
    // This can only accept string. 
    var allowedReturnTypes;
    allowedReturnTypes = {string: true};
    kukit.E = 'action error parameter [' + key + ']';
    var value = this.preprocessValues(values, allowedReturnTypes, kukit.E).string;
    // It cannot be a provider, it must be a real string.
    if (value.isMethod == true) {
        kukit.E = 'Wrong value for key [' + key + '] : ';
        kukit.E += 'value providers are not ';
        kukit.E += 'allowed for <ACTIONNAME>-error keys.';
        this.emitError(kukit.E);
    }
    action.setError(value.txt);
    // also create the action for the error itself.
    var err_action = this.actions.getOrCreateAction(value.txt, {});
    err_action.setType('E');
};

this.addActionParameter = function(action, key, values) {
    // <ACTIONNAME>-<KEY>: <VALUE>
    // default-<KEY>: <VALUE>
    // 
    // value may be either txt or method parms, 
    // and they get stored with the wrapper.
    // 
    // Check the syntax of the value at this point.
    // This will also set the value providers on the value
    // (from check).
    //
    var value;
    if (key.substr(0, 3) == 'kss') {
        // Special selector types can have only one value
        if (values.length != 1) {
            kukit.E = 'Must have exactly one value, and got [' + values.length;
            kukit.E += '] in the kss action parameter [' + key + '].';
            this.emitError(kukit.E);
        }
        value = values[0];
        // kss special parameter need special checking of the strings.
        // (not needed in production mode, since we have the value already)
        var allowedReturnTypes = {};
        if (key == 'kssSelector') {
            // for kssSelector, one of string or formquery expected
            allowedReturnTypes = {string: true, selection: true};
        } else if (key == 'kssSubmitForm') {
            // for kssSubmitForm string or formquery expected
            allowedReturnTypes = {string: true, formquery: true};
        } else if (key == 'kssUrl') {
            // for kssUrl string or url expected
            allowedReturnTypes = {string: true, url: true};
        }
        // We ignore actual results here, and just check. 
        kukit.E = 'kss action parameter [' + key + ']';
        // Call preprocessValues in both production and development mode:
        // it is always needed, since it calls check() on the value.
        // Last parameter is true: means we do _not_ require the existence
        // of a string type.
        this.preprocessValues(values, allowedReturnTypes, kukit.E, true);
    } else {
        // Normal selectors: can have more values
        // check its return types
        var allowedReturnTypes;
        allowedReturnTypes = {string: true};
        kukit.E = 'action parameter [' + key + ']';
        var valuesByReturnType = this.preprocessValues(values, allowedReturnTypes, kukit.E);
        value = valuesByReturnType.string;
    }
    // store the (main, string) value
    action.parms[key] = value;
};

this.addDeclaration = function(key, values) {
    // values contains a list of arguments (KssTextValue or KssMethodValue)
    //
    // the key looks like this:
    //
    // evt-<EVTNAME>-<KEY>: <VALUE>
    // evt-<NAMESPACE>-<EVTNAME>-<KEY>: <VALUE>
    //
    // action-server: <ACTIONNAME>
    // action-client: <ACTIONNAME>
    // action-client: <NAMESPACE>-<ACTIONNAME>
    // action-cancel: <ACTIONNAME>
    // action-cancel: <NAMESPACE>-<ACTIONNAME>
    //
    // <ACTIONNAME>-<KEY>: <VALUE>
    // <NAMESPACE>-<ACTIONNAME>-<KEY>: <VALUE>
    // <ACTIONNAME>-error: <VALUE>
    // <NAMESPACE>-<ACTIONNAME>-error: <VALUE>
    //
    // default-<KEY>: <VALUE>
    // default-error: <VALUE>
    //
    var splitkey = key.split('-');
    if (splitkey.length < 2 || splitkey.length > 4) {
        kukit.E = 'Wrong rule key : "' + key + '". ';
        kukit.E += 'KSS rule key must be "<ACTIONNAME>-<PARAMETER>" or ';
        kukit.E += '"<NAMESPACE>-<ACTIONNAME>-<PARAMETER>" or ';
        kukit.E += '"evt-<EVENTNAME>-<PARAMETER>" or ';
        kukit.E += '"evt-<NAMESPACE>-<EVENTNAME>-<PARAMETER>".';
        this.emitError(kukit.E);
    }
    // Preprocess the values
    //
    var name = splitkey[0];
    if (name == 'evt') {
        this.addEventDeclaration(key, splitkey, values);
    } else if (name == 'action') {
        this.addActionDeclaration(key, splitkey, values);
    } else {
        // <ACTIONNAME>-<KEY>: <VALUE>
        // <NAMESPACE>-<ACTIONNAME>-<KEY>: <VALUE>
        // <ACTIONNAME>-error: <VALUE>
        // <NAMESPACE>-<ACTIONNAME>-error: <VALUE>
        // default-<KEY>: <VALUE>
        // default-error: <VALUE>
        var actionName;
        var actionKey;
        if (splitkey.length == 2) {
            // <ACTIONNAME>-<KEY>: <VALUE>
            // <ACTIONNAME>-error: <VALUE>
            // default-<KEY>: <VALUE>
            // default-error: <VALUE>
            actionName =  splitkey[0];
            actionKey = splitkey[1];
        } else {
            // <NAMESPACE>-<ACTIONNAME>-<KEY>: <VALUE>
            // <NAMESPACE>-<ACTIONNAME>-error: <VALUE>
            actionName = splitkey[0] + '-' + splitkey[1];
            actionKey = splitkey[2];
        }
        var action = this.actions.getOrCreateAction(actionName, {});
        if (actionKey == 'error') {
            this.addActionError(action, key, values);
        } else {
            this.addActionParameter(action, actionKey, values);
        }
    }
};

this.preprocessValues = function(values, allowedReturnTypes, 
        errInfo, noStringRequired) {
    // allowedReturnTypes is a dict keyed by the returnType, containing true as value.
    // key is only used for the error reporting
    // This will also call check on all the value names!
    // noStringRequired is set to true at the kss special parameters. All other
    // occasions require at least a string to be present, so we check for that too.
    var valuesByReturnType = {};

    for (var i=0; i<values.length; i++) {
        var value = values[i];
        // Checking the value
        // this is needed for later evaluation.
        try {
            // Check also sets the value provider on the value.
            value.check();
        } catch(e) {
            kukit.E = 'Error in value for ' + errInfo + ' : ' + e + '.';
            this.emitError(kukit.E);
        }
        // XXX text values are not wrapped. So we need to check for the
        // pprovider....
        var returnType = (typeof(value.pprovider) != 'undefined') && value.pprovider.returnType;
        //for(var xx in value) {print (xx, value[xx]);}
        // Default return type is "string".
        if (! returnType) {
            returnType = 'string';
        }
        // Check if return type is allowed.
        if (! allowedReturnTypes[returnType]){
            kukit.E = 'Provider result type [' + returnType;
            kukit.E += '] not allowed in the ' + errInfo +  '.';
            this.emitError(kukit.E);
        }
        // Check duplicate type. Only one provider is allowed
        // from each return type, ie. maximum one string,
        // one selector, etc.
        if (typeof(valuesByReturnType[returnType]) != 'undefined') {
            if (returnType == 'string') {
                // Give a more sensible message for strings.
                // (Do not mention the word "provider" in the message
                // as action-xxx cannot take providers, only real strings.
                kukit.E = 'Only one [string] value ';
                kukit.E += 'is allowed in the ' + errInfo +  '.';
            } else {
                kukit.E = 'Only one provider with result type [' + returnType;
                kukit.E += '] is allowed in the ' + errInfo +  '.';
            }
            this.emitError(kukit.E);
        }
        // store it
        valuesByReturnType[returnType] = value;
    }
    // Check we have at least a string type. (unless asked otherwise)
    if (! noStringRequired && typeof(valuesByReturnType.string) == 'undefined') {
        // (Do not mention the word "provider" in the message
        // as action-xxx cannot take providers, only real strings.
        kukit.E = 'Missing [string] value ';
        kukit.E += 'in the ' + errInfo +  '.';
        this.emitError(kukit.E);
    }
    return valuesByReturnType;
};

};
kssp.Block = kukit.tk.mkParser('block', {
    ";": _mkReturnToken(kssp.semicolon),
    ":": function() {
             return [new kssp.colon(this.cursor), 
                 new kssp.MultiPropValue(this.cursor)]
             },
    "}": _mkEmitAndReturnToken(kssp.closeBrace)
    },
    _Block
    );

/*
* class PropValue
*/
var _PropValue = function() {

this.process = function() {
    // For multivalue only
    this.values = [];
    // Parse all tokens (including first and last)
    var context = {'nextTokenIndex': 0};
    this.txt = '';
    // Iterate for multiple values (in case allowed.)
    // txtCarry holds the part of text that we need to consider
    // as a possible method name, in case method args follow.
    var txtCarry = '';
    while (context.nextTokenIndex < this.result.length) { 
        if (this.notInTokens(context, kukit.kssp.String)) {
            // A string token follows:
            if (txtCarry) {
                // If we have a txt carry left, it needs to be 
                // produced first, separately.
                this.produceTxt(txtCarry);
                txtCarry = '';
            }
            // the next one must be a string.
            this.expectToken(context, kukit.kssp.String);
            this.produceTxt(context.token.txt);
        } else if (this.notInTokens(context, kukit.kssp.MethodArgs)) {
            // A MethodArgs token follows:
            // see if not empty
            if (! txtCarry) {
                // Be a little more intelligent with this error.
                // If we are single value, and there is a value,
                // the following raises a smarter error message, complaining
                // about the () as excess.
                this.addValue(null, '(');
                // otherwise, just do the next error message:
                kukit.E = 'Wrong value : empty method name.';
                this.emitError(kukit.E);
            }
            // the next one must be the (a1, a2, ...an) method args.
            this.expectToken(context, kukit.kssp.MethodArgs);
            // The txtCarry will be used as the name of the method.
            this.addValue(new kukit.rd.KssMethodValue(txtCarry, context.token.args),
                         txtCarry);
            txtCarry = '';
        } else {
            // Try to digest another fraction.
            this.digestTxt(context, kukit.tk.Fraction, kukit.kssp.Comment);
            //
            // Split the fraction to words. We may have a word
            // and we may have a MethodArg after:
            //   wordone ... wordlast(...) ...
            //   ^^^^^^^^^^^^^^^^^^^^           - these are in the Fraction
            //                       ^^^^^      - these are the MethodArgs 
            // So we produce all strings except the last one, and
            // continue the cycle with the last one (worlast) as txt.
            // This enables it to be produced with the MethodArgs.
            //
            var words = context.txt.split(' ');
            // Emit the original txtCarry - if there is one.
            if (txtCarry) {
                this.produceTxt(txtCarry);
                txtCarry = '';
            }
            // If we have input, process it.
            if (words.length > 0) {
                // Produce all strings except the last one
                for (var i=0; i<words.length - 1; i++) {
                    this.produceTxt(words[i]);
                }
                // Carry the last one to the next iteration.
                txtCarry = words[words.length - 1];
            }
        }
    }
    if (txtCarry) {
        // If we have a txt carry, it needs to be produced finally.
        this.produceTxt(txtCarry);
    }
    this.result = [];
};

this.initialize = function() {
    this.multiword_allowed = false;
    this.valueClass = kukit.rd.KssMethodValue;
};

this.produceTxt = function(txt) {
    this.addValue(new kukit.rd.KssTextValue(txt), txt);
};

this.addValue = function(value, errInfo) {
    // Do not allow a second value
    if (this.value) {
        kukit.E = 'Wrong value : unallowed characters [';
        kukit.E += errInfo + '] after ';
        kukit.E += 'the argument.';
        this.emitError(kukit.E);
    }
    this.value = value;
};

this.initialize.apply(this, arguments);
};
kssp.PropValue = kukit.tk.mkParser('propValue', {
    ";": _emitAndReturn,
    "}": _emitAndReturn,
    ")": _emitAndReturn,
    "]": _emitAndReturn,
    ",": _emitAndReturn,
    "'": _returnString,
    '"': _returnString2,
    "\/\*": _returnComment,
    "(": _returnMethodArgs
    },
    _PropValue
    );

/*
* class MultiPropValue
* 
* A list of PropValue-s (arguments), separated by whitespace
*/
var _MultiPropValue = function() {

    this.addValue = function(value, errInfo) {
        this.values.push(value);
    };

    this.initialize = function() {
        this.multiword_allowed = true;
    };

};
_MultiPropValue.prototype = new _PropValue();
kssp.MultiPropValue = kukit.tk.mkParser('multiPropValue', {
    ";": _emitAndReturn,
    "}": _emitAndReturn,
    ")": _emitAndReturn,
    ",": _emitAndReturn,
    "'": _returnString,
    '"': _returnString2,
    "\/\*": _returnComment,
    "(": _returnMethodArgs
    },
    _MultiPropValue
    );


/*
* class EventValue
*
*/
var _EventValue = function() {

this.initialize = function() {
    this.multiword_allowed = false;
};

this.process = function() {
    // Parse all tokens (including first and last)
    var context = {'nextTokenIndex': 0};
    this.digestTxt(context, kukit.tk.Fraction, kssp.Comment);
    this.txt = '';
    var txt = context.txt;
    if (this.notInTokens(context, kssp.String)) {
        // The previous txt must be all whitespace.
        if (txt) {
            kukit.E = 'Wrong value : unallowed characters [' + txt + ']';
            kukit.E += ' before a string.';
            this.emitError(kukit.E);
        }
        // the next one must be a string.
        this.expectToken(context, kssp.String);
        this.produceTxt(context.token.txt);
    } else if (this.notInTokens(context, kssp.openParent)) {
        this.expectToken(context, kssp.openParent);
        this.expectToken(context, kssp.PropValue);
        this.value = new kukit.rd.KssEventValue(txt, context.token.value);
        this.digestTxt(context, kukit.tk.Fraction, kssp.Comment);
        // we have to be at the end and have no text after
        if (context.txt) {
            kukit.E = 'Wrong event selector : [' + context.txt; 
            kukit.E += '] is not expected before the closing';
            kukit.E += ' parenthesis. :<EVENTNAME>(<ID>) can have';
            kukit.E += ' only one parameter.';
            this.emitError(kukit.E);
        }
        // eat up everything before the closing parent
        this.expectToken(context, kssp.closeParent);
    } else {
        // not a string or method: check if we allowed multiword.
        if (! this.multiword_allowed && txt.indexOf(' ') != -1) {
            kukit.E = 'Wrong value : [' + txt + '] cannot have spaces.';
            this.emitError(kukit.E);
        }
        this.produceTxt(txt);
    }
    // see what's after
    if (context.nextTokenIndex < this.result.length) {
        this.digestTxt(context, kukit.tk.Fraction, kssp.Comment);
        // we have to be at the end and have no text after
        if (context.nextTokenIndex < this.result.length || context.txt) {
            kukit.E = 'Excess characters after the property value';
            this.emitError(kukit.E);
        }
    }
    this.result = [];
};

this.produceTxt = function(txt) {
    // txt parms are returned embedded
    this.value = new kukit.rd.KssEventValue(txt, null);
};
this.initialize.apply(this, arguments);
};
kssp.EventValue = kukit.tk.mkParser('propValue', {
    "{": _emitAndReturn,
    " ": _emitAndReturn,
    "\t": _emitAndReturn,
    "\n": _emitAndReturn,
    "\r": _emitAndReturn,
    "\/\*": _emitAndReturn,
    ":": _emitAndReturn,
    "(": function() {
             return [new kssp.openParent(this.cursor),
                 new kssp.PropValue(this.cursor)]
             },
    ")": _mkEmitAndReturnToken(kssp.closeParent)
    },
    _EventValue
    );

/*
* class String
*/
var _String = function() {

this.process = function() {
    // collect up the value of the string, omitting the quotes
    this.txt = '';
    for (var i=1; i<this.result.length-1; i++) {
        this.txt += this.result[i].txt;
    }
};

};
kssp.String = kukit.tk.mkParser('string', {
    "'": _mkEmitAndReturnToken(kssp.quote),
    '\x5c': _returnBackslashed
    },
    _String
    );

/*
* class String2
*/
kssp.String2 = kukit.tk.mkParser('string', {
    '"': _mkEmitAndReturnToken(kssp.dquote),
    '\x5c': _returnBackslashed
    },
    _String
    );

/*
* class StringInSelector
*/
var _StringInSelector = function() {

this.process = function() {
    // collect up the value of the string, including the quotes
    this.txt = '';
    for (var i=0; i<this.result.length; i++) {
        this.txt += this.result[i].txt;
    }
};

};
kssp.StringInSelector = kukit.tk.mkParser('string', {
    "'": _mkEmitAndReturnToken(kssp.quote),
    '\x5c': _returnBackslashed
    },
    _StringInSelector
    );

/*
* class String2InSelector
*/
kssp.String2InSelector = kukit.tk.mkParser('string', {
    '"': _mkEmitAndReturnToken(kssp.dquote),
    '\x5c': _returnBackslashed
    },
    _StringInSelector
    );

/*
* class Backslashed
*/
var _Backslashed = function() {

this.nextStep = function(table) {
    // digest the next character and store it as txt
    var cursor = this.cursor;
    var length = cursor.text.length;
    if (length < cursor.pos + 1) {
        kukit.E = 'Missing character after backslash.';
        this.emitError(kukit.E);
    } else { 
        this.result.push(new kukit.tk.Fraction(cursor, cursor.pos+1));
        this.cursor.pos += 1;
        this.finished = true;
    }
};

this.process = function() {
    this.txt = this.result[1].txt;
};

};
kssp.Backslashed = kukit.tk.mkParser('backslashed', {
    },
    _Backslashed
    );

/*
* class MethodArgs
*
* methodargs are (a, b, c) lists.
*/
var _MethodArgs = function() {

this.process = function() {
    this.args = [];
    // Parse all tokens (except first and last)
    var context = {'nextTokenIndex': 1};
    while (context.nextTokenIndex < this.result.length-1) {
        this.digestTxt(context, kukit.tk.Fraction, kssp.Comment);
        var value = context.txt;
        if (! value) {
            // allow to bail out after widow ,
            if (context.nextTokenIndex == this.result.length-1) break;
            // here be a string then.
            this.expectToken(context, kssp.String);
            value = context.token.txt;
        } else {
            // Just a value, must be one word then.
            if (value.indexOf(' ') != -1) {
                kukit.E = 'Wrong method argument [' + value;
                kukit.E += '] : value cannot have spaces (if needed,';
                kukit.E += ' quote it as a string).';
                this.emitError(kukit.E);
            }
        }
        var valueClass;
        var args;
        var providedValue;
        if (this.notInTokens(context, kssp.MethodArgs)){
            this.expectToken(context, kssp.MethodArgs);
             valueClass = kukit.rd.KssMethodValue;
             args = context.token.args;
             providedValue = new valueClass(value, args);
        } else {
             // XXX This should be wrapped too !
             //valueClass = kukit.rd.KssTextValue;
             //providedValue = new valueClass(value);
             providedValue = value;
        }
        this.args.push(providedValue);
        if (context.nextTokenIndex == this.result.length-1) break;
        this.expectToken(context, kssp.comma);
    }
    this.result = [];
    this.txt = '';
};

};
kssp.MethodArgs = kukit.tk.mkParser('methodargs', {
    "'": _returnString,
    '"': _returnString2,
    ",": _mkReturnToken(kssp.comma),
    ")": _mkEmitAndReturnToken(kssp.closeParent),
    "(": _returnMethodArgs,
    "\/\*": _returnComment
    },
    _MethodArgs
    );

/*
* class KssSelectors
*
* embedded parser to parse the block of selectors
* KSS event selector: (has spaces in it)
*      <css selector> selector:name(id)
* KSS method selector: (has no spaces in it)
*      document:name(id) or behaviour:name(id)
*/
var _KssSelectors = function() {

this.process = function() {
    this.selectors = [];
    // Parse all tokens (including first and last)
    var context = {'nextTokenIndex': 0};
    while (context.nextTokenIndex < this.result.length) {
        this.digestTxt(context, kukit.tk.Fraction, kssp.Comment,
            kssp.String, kssp.String2);
        var cursor = new kukit.tk.Cursor(context.txt + ' ');
        var parser = new kssp.KssSelector(cursor, null, true);
        this.selectors.push(parser.kssSelector);
        if (context.nextTokenIndex == this.result.length) break;
        this.expectToken(context, kssp.comma);
        if (context.nextTokenIndex == this.result.length) {
           kukit.E = 'Wrong event selector : trailing comma';
           this.emitError(kukit.E); 
        }
    };
    this.result = [];
    this.txt = '';
};

};
kssp.KssSelectors = kukit.tk.mkParser('kssselectors', {
    "'": function() {
             return new kssp.StringInSelector(this.cursor, kssp.quote);
             },
    '"': function() {
             return new kssp.String2InSelector(this.cursor, kssp.dquote);
             },
    ",": _mkReturnToken(kssp.comma),
    "{": _emitAndReturn,
    "\/\*": _returnComment
    },
    _KssSelectors 
    );

/*
* class KssSelector
*
* embedded parser to parse the selector
* KSS event selector: (has spaces in it)
*      <css selector> selector:name(id)
*      <css selector> selector:name(pprov(id))
* kss method selector: (has no spaces in it)
*      document:name(id) or behaviour:name(id)
*      document:name(pprov(id)) or behaviour:name(pprov(id))
*/
var _KssSelector = function() {

this.process = function() {
    var name;
    var namespace = null;
    var id = null;
    var tokenIndex = this.result.length - 1;
    // Find the method parms and calculate the end of css parms. (RL)
    var cycle = true;
    while (cycle && tokenIndex >= 0) {
        var token = this.result[tokenIndex];
        switch (token.symbol) {
            case kukit.tk.Fraction.prototype.symbol: {
                // if all spaces, go to previous one
                if (token.txt.match(/^[\r\n\t ]*$/) != null) {
                    tokenIndex -= 1;
                } else {
                    kukit.E = 'Wrong event selector : missing event ';
                    kukit.E += 'qualifier :<EVENTNAME> ';
                    kukit.E += 'or :<EVENTNAME>(<ID>).';
                    this.emitError(kukit.E);
                }
            } break;
            case kssp.Comment.prototype.symbol: {
                tokenIndex -= 1;
            } break;
            default: {
                cycle = false;
            } break;
        }
    }
    // Now we found the token that must be <fraction> <colon> <multiPropValue>.
    tokenIndex -= 2;
    if (tokenIndex < 0
         || (this.result[tokenIndex+2].symbol !=
                kssp.EventValue.prototype.symbol)
         || (this.result[tokenIndex+1].symbol != 
                kssp.colon.prototype.symbol)
         || (this.result[tokenIndex].symbol !=
                kukit.tk.Fraction.prototype.symbol)) {
        kukit.E = 'Wrong event selector : missing event qualifier ';
        kukit.E += ':<EVENTNAME> or :<EVENTNAME>(<ID>).';
        this.emitError(kukit.E);
    }
    // See that the last fraction does not end with space.
    var lasttoken = this.result[tokenIndex];
    var commatoken = this.result[tokenIndex+1];
    var pseudotoken = this.result[tokenIndex+2];
    var txt = lasttoken.txt;
    if (txt.match(/[\r\n\t ]$/) != null) {
        kukit.E = 'Wrong event selector :';
        kukit.E += ' space before the colon.';
        this.emitError(kukit.E);
    }
    if (! pseudotoken.value.methodName) {
        kukit.E = 'Wrong event selector :';
        kukit.E += ' event name cannot have spaces.';
        this.emitError(kukit.E);
    }
    css = this.cursor.text.substring(this.startpos, commatoken.startpos);
    // Decide if we have an event or a method selector.
    // We have a method selector if a single word "document" or "behaviour".
    var singleword = css.replace(/[\r\n\t ]/g, ' ');
    if (singleword && singleword.charAt(0) == ' ') {
        singleword = singleword.substring(1);
    }
    var isEvent = (singleword != 'document' && singleword != 'behaviour');
    if (! isEvent) {
        // just store the single word, in case of event selectors
        css = singleword;
    }
    // create the selector.
    var id = null;
    var ppid = null;
    if (pseudotoken.value.arg) {
        // We have something in the parentheses after the event name.
        if (pseudotoken.value.arg.isMethod) {
            // we have a param provider here. Just store.
            ppid = pseudotoken.value.arg;
            // Check its syntax too.
            ppid.check(kukit.pprovidersGlobalRegistry);
        } else {
            // just an id. Express in txt.
            id = pseudotoken.value.arg.txt;
        }
    }
    var name = pseudotoken.value.methodName;
    var splitname = name.split('-');
    var namespace = null;
    if (splitname.length > 2) {
        kukit.E = 'Wrong event selector [' + name + '] : ';
        kukit.E += 'qualifier should be :<EVENTNAME> or ';
        kukit.E += ':<NAMESPACE>-<EVENTNAME>.';
        this.emitError(kukit.E);
    } else if (splitname.length == 2) { 
        name = splitname[1];
        namespace = splitname[0];
    }
    // Protect the error for better logging
    try {
        this.kssSelector = new kukit.rd.KssSelector(isEvent, css, name,
            namespace, id, ppid, kukit.eventsGlobalRegistry);
    } catch(e) {
        if (e.name == 'KssSelectorError') {
            // Log the message
            this.emitError(e.toString());
        } else {
            throw e;
        }
    };
    this.txt = '';
    this.result = [];
};

};
kssp.KssSelector = kukit.tk.mkParser('kssselector', {
    ":": function() {
             return [new kssp.colon(this.cursor),
                     new kssp.EventValue(this.cursor)];
             },
    "{": _emitAndReturn,
    "\/\*": _returnComment
    },
    _KssSelector 
    );

/*
* class KssRuleProcessor
*
* Rule processor that interfaces with kukit core
*/
kssp.KssRuleProcessor = function(href) {

this.initialize = function() {
    this.href = href;
    this.loaded = false;
    this.rules = [];
};
    
this.load = function() {
      // Opera does not support getDomDocument.load, so we use XMLHttpRequest
      var domDoc = new XMLHttpRequest();
      domDoc.open("GET", this.href, false);
      domDoc.send(null);
      this.txt = domDoc.responseText;
      this.loaded = true;
};

this.parse = function() {
    try {
        //Build a parser and parse the text into it
        var cursor = new kukit.tk.Cursor(this.txt);
        var parser = new kssp.Document(cursor, null, true);
        // Store event rules in the common list
        for (var i=0; i<parser.eventRules.length; i++) {
            var rule = parser.eventRules[i];
            rule.kssSelector.prepareId();
            this.rules.push(rule);
        }
    } catch(e) {
       // ParsingError are logged.
       if (e.name == 'ParsingError' || e.name == 'UndefinedEventError') {
           throw kukit.err.kssParsingError(e, this.href);
       } else {
           throw e;
       }
    }
};
this.initialize.apply(this, arguments);
};

}();                              /// MODULE END

/*
* Copyright (c) 2005-2007
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

kukit.er = new function() {   /// MODULE START

var er = this;

var _eventClassCounter = 0;

/*
*
* class _EventRegistry
*
* available for plugin registration
*
* usage:
*
* kukit.eventsGlobalRegistry.register(namespace, eventName, func, 
*    bindMethodName, defaultActionMethodName);
* 
* namespace = null: means global namespace
* defaultActionMethodName = null: if there is no default action implemented
* klass must be a class (constructor) function, this is the class that
*     implements the binder.
*
*/
var _EventRegistry = function() {

this.initialize = function() {
    this.content = {};
    this.classes = {};
    this.eventSets = [];
};

/* binder registration */

this.registerBinder = function(klass) {
    if (typeof(klass) == 'undefined') {
        kukit.E = 'klass argument is mandatory when registering an event';
        kukit.E += ' binder (_EventRegistry.registerBinder).';
        throw new Error(kukit.E);
    }
    // See if we are set up already?
    // We make a mark not on the class prototype,
    // but on the class itself. This will make
    // sure inherited classes get a distinct class name.
    if (klass.__decorated_for_kss__) {
        return;
    }
    // We do _not_ overwrite the class's prototype, since
    // that destroys any inheritance it has. Our purpose
    // is to allow any javascript class to function, so
    // we copy the class's attributes to the prototype.
    var binder_prototype = new _EventBinder();
    for (var key in binder_prototype) {
        klass.prototype[key] = binder_prototype[key];
    }
    // Create a className, and register it too.
    //
    // The reason to create a __className__ is to provide a
    // way to lookup the class by a string. This is needed
    // because dict keys in javascript can only be strings.
    className = '' + _eventClassCounter;
    _eventClassCounter += 1;
    klass.prototype.__className__ = className;
    this.classes[className] = klass;
    // mark decorated. We store the class there
    // so we can decide if this class has been
    // decorated or not.
    klass.__decorated_for_kss__ = true;
};

this.existsBinder = function(className) {
    var klass = this.classes[className];
    return (typeof(klass) != 'undefined');
};

this.getBinderClass = function(className) {
    var klass = this.classes[className];
    if (! klass) {
        // not found
        kukit.E = 'Error : undefined event setup type [' + className + '].';
        throw new Error(kukit.E);
        }
    return klass;
};

/* events (methods) registration  helpers (not to be called directly) */

this._register = function(namespace, eventName, klass,
        bindMethodName, defaultActionMethodName, iterName) {
    if (typeof(defaultActionMethodName) == 'undefined') {
        kukit.E = 'Missing arguments when calling [_EventRegistry.register].';
        throw new Error(kukit.E);
    }
    // Register and decorate the binder's class.
    this.registerBinder(klass);
    if (!eventName) {
        kukit.E = '[eventName] argument cannot be empty when registering';
        kukit.E += ' an event with [_EventRegistry.register].';
        throw new Error(kukit.E);
    }
    var key = this._getKey(namespace, eventName);
    var entry = this.content[key];
    if (typeof(entry) != 'undefined') {
        if (key[0] == '-') {
            key = key.substring(1);
        }
        kukit.E = 'Attempt to register key [' + key;
        kukit.E += '] twice when registering';
        kukit.E += ' an event with [_EventRegistry.register].';
        throw new Error(kukit.E);
    }
    // XXX We do not check bindMethodName and defaltActionMethodName
    // here, because at this point they may be hidden by closure.
    // 
    // check the iterator.
    if  (! er.getBindIterator(iterName)) {
        kukit.E = 'In _EventRegistry.register unknown bind iterator [';
        kukit.E += iterName + '].';
        throw new Error(kukit.E);
    }
    // register it
    this.content[key] = {
        'className': className,
        'bindMethodName': bindMethodName,
        'defaultActionMethodName': defaultActionMethodName,
        'iterName': iterName
        };
};

/* events (methods) binding [ForAll] registration */

this._registerEventSet =
    function(namespace, names, iterName, bindMethodName) {
    // At this name the values should be checked already. so this should
    // be called _after_ _register.
    this.eventSets.push({
        'namespace': namespace, 
        'names': names,
        'iterName': iterName,
        'bindMethodName': bindMethodName
        });
};

/* there are the actual registration methods, to be called from plugins */

this.register =
    function(namespace, eventName, klass, bindMethodName,
        defaultActionMethodName) {
    this._register(namespace, eventName, klass, bindMethodName,
        defaultActionMethodName, 'EachLegacy');
    this._registerEventSet(namespace, [eventName], 'EachLegacy',
        bindMethodName);
};

this.unregister =
    function(namespace, eventName) {
    var key = this._getKey(namespace, eventName);
    delete this.content[key];
    var found = null;
    for (var i=0; i < this.eventSets.length; i++) {
        var eventSet = this.eventSets[i];
        if (eventSet['namespace'] == namespace) {
            found = i;
            break;
        }
    }
    if (found != null) {
        this.eventSets.splice(found, 1);
    }
};

this.registerForAllEvents =
    function(namespace, eventNames, klass,
        bindMethodName, defaultActionMethodName, iterName) {
    if (typeof(eventNames) == 'string') {
        eventNames = [eventNames];
        }
    for (var i=0; i<eventNames.length; i++) {
        var eventName = eventNames[i];
        this._register(namespace, eventName, klass, bindMethodName, 
            defaultActionMethodName, iterName);
    }
    this._registerEventSet(namespace, eventNames, iterName, bindMethodName);
};

this._getKey = function(namespace, eventName) {
    if (namespace == null) {
        namespace = '';
    } else if (namespace.split('-') > 1) {
        kukit.E = 'In [_EventRegistry.register], [namespace] cannot have';
        kukit.E += 'dashes.';
        throw new Error(kukit.E);
    }
    return namespace + '-' + eventName;
};

this.exists = function(namespace, eventName) {
    var key = this._getKey(namespace, eventName);
    var entry = this.content[key];
    return (typeof(entry) != 'undefined');
};

this.get = function(namespace, eventName) {
    var key = this._getKey(namespace, eventName);
    var entry = this.content[key];
    if (typeof(entry) == 'undefined') {
        if (key.substr(0, 1) == '-') {
            key = key.substring(1);
            kukit.E = 'Error : undefined global event [';
            kukit.E += key + '] (or maybe namespace is missing ?).';
        } else {
            kukit.E = 'Error : undefined namespace or event in [' + key + '].';
        }
        throw new Error(kukit.E);
    } 
    return entry;
};

this.getBinderClassByEventNamespace = function(namespace, eventName) {
   return this.getBinderClass(this.get(namespace, eventName).className);
};
this.initialize.apply(this, arguments);
};


kukit.eventsGlobalRegistry = new _EventRegistry();

/* XXX deprecated methods, to be removed asap */

var _eventRegistry = function() {
    this.register = function(namespace, eventName, klass,
            bindMethodName, defaultActionMethodName) {
        var msg = 'Deprecated _eventRegistry.register,';
        msg += ' use kukit.eventsGlobalRegistry.register instead ! [';
        msg += namespace + '-' + eventName + '].';
        kukit.logWarning(msg);
        kukit.eventsGlobalRegistry.register(namespace, eventName, klass,
            bindMethodName, defaultActionMethodName);
    };
};

/*
*
* class _LateBinder
*
* postpone binding of actions until called first time
*
*/
var _LateBinder = function() {

this.initialize = function(binder, name, node) {
    this.binder = binder;
    this.name = name;
    this.node = node;
    this.boundEvent = null;
};

this.executeActions = function() {
    if (! this.boundEvent) {
        var msg = 'Attempt of late binding for event [' + this.name;
        msg += '], node [' + this.node.nodeName + '].';
        kukit.log(msg);
        if (kukit.hasFirebug) {
            kukit.log(this.node);
        }
        var info = kukit.engine.binderInfoRegistry.getBinderInfoById(
            this.binder.__binderId__);
        var oper = info.bound.getBoundOperForNode(this.name, this.node);
        if (oper) {
            // (if eventRule is null here, we could still have the default
            // method, so go on.)
            oper.parms = {};
            this.boundEvent = function() {
                this.binder.triggerEvent(this.name, oper);
            };
            kukit.log('Node bound.');
        } else {
            kukit.logWarning('No node bound.');
            this.boundEvent = function() {};
        }
    }
    this.boundEvent();
};        
this.initialize.apply(this, arguments);
};

/*
*
* class _EventBinder
*
* Provide callins on the state instance that execute a given
*  continuation event.
*  Parameters will be the ones specified in the call + 
*  those defined in the rule will be added too. (Parameters can
*  be accessed with the [pass] kss parameter provider.)
*
* Call examples: 
*
* trigger an event bound to a given state instance, same node
*
*     binder.continueEvent('doit', oper.node, {'extravalue': '5'});
*
*   with kss rule:
*
*     node.selector:doit {
*         action-client: log;
*         log-message: pass(extravalue);
*     }
*
*  or
*
*     behaviour.selector:doit {
*         action-client: log;
*         log-message: pass(extravalue);
*     }
*
* trigger an event bound to a given state instance, and the document
* (different from current scope)
*
*     binder.continueEvent('doit', null, {'extravalue': '5'});
*
*   with kss rule:
*
*     document:doit {
*         action-client: log;
*         log-message: pass(extravalue);
*     }
*
*  or
*
*     behaviour.selector:doit {
*         action-client: log;
*         log-message: pass(extravalue);
*     }
*
* trigger an event on all the nodes + document bound to a given state instance
*
*     binder.continueEventAllNodes('doit', {'extravalue': '5'});
*
*   with kss rule:
*
*     node.selector:doit {
*         action-client: log;
*         log-message: pass(extravalue);
*     }
*
* p.s. oper is not required to make it easy to adapt existing code
* so we create a new oper below
*/

var _EventBinder = function() {

this.continueEvent = function(name, node, defaultParameters) {
    // Trigger a continuation event bound to a given state instance, given node
    // (or on document, if node = null)
    //
    var oper = new kukit.op.Oper();
    oper.node = node;
    if (node) {
        // if we found the binding, just use that
        var info = kukit.engine.binderInfoRegistry.getBinderInfoById(
            this.__binderId__);
        var newOper = info.bound.getBoundOperForNode(name, node);
        if (newOper) {
            oper = newOper;
        }
    } else {
        oper.eventRule =  kukit.engine.documentRules.getMergedRule(
            'document', name, this);
    }
    // Look up the behaviour rule, if any.
    var behav_eventRule =  kukit.engine.documentRules.getMergedRule(
        'behaviour', name, this);
    if (behav_eventRule) {
        if (! oper.eventRule) {
            // There was no node matching for the rule, use behaviour rule
            // this allows to set up parametrized actions in general.
            oper.eventRule = behav_eventRule;
        } else {
            // XXX this case should go away, as we should check
            // this already from binding time
            // and signal the appropriate error.
            // Also note that behaviour roles will only be allowed
            // for "non-binding" events.
            var msg = 'Behaviour rule for continuation event [' + name;
            msg += '] will be ignored, because we found an explicit rule.';
            kukit.logError(msg);
        }
    }
    // If parms are specified in the call, use them.
    if (typeof(defaultParameters) != 'undefined') {
        oper.defaultParameters = defaultParameters;
    } else {
        oper.defaultParameters = {};
    }
    // if eventRule is null here, we can yet have the default method, so go on.
    this.triggerEvent(name, oper);
    kukit.logDebug('Continuation event [' + name + '] executed on same node.');
};

this.__continueEvent__ = function(name, node, defaultParameters) {
    var msg = 'Deprecated [__continueEvent__],';
    msg += 'use [continueEvent] instead !';
    kukit.logWarning(msg);
    this.continueEvent(name, node, defaultParameters);
};

this.continueEventAllNodes = function(name, defaultParameters) {
    // Trigger an event bound to a given state instance, on all nodes.
    // (or on document, if node = null)
    // if no other nodes execute.
    var executed = 0;
    // Normal rules. If any of those match, execute them too
    // each on the node that it selects - not on the original node.
    var oper = new kukit.op.Oper();
    var info = kukit.engine.binderInfoRegistry.getBinderInfoById(
        this.__binderId__);
    var opers = info.bound.getBoundOpers(name);
    for (var i=0; i<opers.length; i++) {
        var oper = opers[i];
        var newOper = oper.clone();
        if (typeof(defaultParameters) != 'undefined') {
            newOper.defaultParameters = defaultParameters;
        } else {
            newOper.defaultParameters = {};
        }
        this.triggerEvent(name, newOper);
        executed += 1;
    }
    kukit.logDebug('Event [' + name + '] executed on ' + executed + ' nodes.');
};

this.__continueEvent_allNodes__ = function(name, defaultParameters) {
    var msg = 'Deprecated [__continueEvent_allNodes__],';
    msg += 'use [continueEventAllNodes] instead !';
    kukit.logWarning(msg);
    this.continueEventAllNodes(name, defaultParameters);
};

this.makeFuncToBind = function(name, node) {
   var executor = new er._LateBinder(this, name, node);
   return function() {
       executor.executeActions();
   };
};

this.__makeFuncToBind__ = function(name, node) {
    var msg = 'Deprecated [__makeFuncToBind__],';
    msg += 'use [makeFuncToBind] instead !';
    kukit.logWarning(msg);
    this.makeFuncToBind(name, node);
};

this.triggerEvent = function(name, oper) {
    // Private. Called from continueEvent or from main event execution.
    oper.binder = this;
    if (oper.eventRule) {
        // Call the actions, if we had an event rule.
        // This includes calling the default action.
        oper.eventRule.actions.execute(oper);
    } else {
        // In case there is no event rule, just call the default event action.
        var namespace = this.__eventNamespace__;
        var msg = 'Calling implicit event [' + name + '] on namespace [';
        msg += namespace + '].';
        kukit.logDebug(msg);
        var success = oper.executeDefaultAction(name, true);
        if (! success) {
            // instead of the standard message give more specific reason:
            // either way we should have executed something...
            kukit.E = 'Could not trigger event name [' + name;
            kukit.E += '] on namespace [' + namespace;
            kukit.E += '], because there is neither an explicit KSS rule,';
            kukit.E += ' nor a default method';
            throw new Error(kukit.E);
        }
    }
};

this._EventBinder_triggerEvent = function(name, oper) {
    var msg = 'Deprecated [_EventBinder_triggerEvent],';
    msg += 'use [triggerEvent] instead !';
    kukit.logWarning(msg);
    this.triggerEvent(name, oper);
};

/* (default) method call handling */

this.callMethod = function(namespace, name, oper, methodName) {
    // hidden method for calling just a method and checking that is exists.
    // (called from oper)
    var method = this[methodName];
    if (! method) {
        kukit.E = 'Could not trigger event name [' + name;
        kukit.E += '] on namespace [' + namespace;
        kukit.E += '], because the method [' + methodName + '] does not exist.';
        throw new Error(kukit.E);
    }
    // call it
    oper.binder = this;
    method.call(this, name, oper);
};

this._EventBinder_callMethod = function(namespace, name, oper, methodName) {
    var msg = 'Deprecated [_EventBinder_callMethod],';
    msg += 'use [callMethod] instead !';
    kukit.logWarning(msg);
    this.callMethod(namespace, name, oper, methodName);
};

};

/* Event instance registry 
*
* class BinderInfoRegistry
*
*  used in run-time to keep track of the event instances
*
*/
er.BinderInfoRegistry = function() {

this.initialize = function() {
    this.info = {};
};

this.getOrCreateBinderInfo =
    function (id, className, namespace) {
    // Get or create the event.
    var binderInfo = this.info[id];
    if (typeof(binderInfo) == 'undefined') {
        // Create a new event.
        var msg = 'Instantiating event id [' + id + '], className [';
        msg += className + '], namespace [' + namespace + '].';
        kukit.logDebug(msg);
        var binderClass = kukit.eventsGlobalRegistry.getBinderClass(className);
        var binder = new binderClass();
        
        binderInfo = this.info[id] = new _BinderInfo(binder);

        // decorate it with id and class
        binder.__binderId__ = id;
        binder.__binderClassName__ = className;
        binder.__eventNamespace__ = namespace;
        // store the bound rules
        //binder.__bound_rules__ = [];
    } else if (binderInfo.getBinder().__binderClassName__ != 
        className) {
        // just paranoia
        kukit.E = 'Conflicting class for event id [' + id + '], [';
        kukit.E += binderInfo.getBinder().__binderClassName__;
        kukit.E += '] != [' + className + '].';
        throw new Error(kukit.E);
    }
    return binderInfo;
};

this.getBinderInfoById = function (id) {
    // Get an event.
    var binderInfo = this.info[id];
    if (typeof(binderInfo) == 'undefined') {
        kukit.E = 'Event with id [' + id + '] not found.';
        throw new Error(kukit.E);
    }
    return binderInfo;
};

this.getSingletonBinderInfoByName =
    function (namespace, name) {
    //Get className
    var className = kukit.eventsGlobalRegistry.get(namespace, name).className;
    // Get an event.
    var id = er.makeId(namespace, className);
    var binderInfo = this.info[id];
    if (typeof(binderInfo) == 'undefined') {
        kukit.E = 'Singleton event with namespace [' + namespace;
        kukit.E += '] and (event) name [' + name + '] not found.';
        throw new Error(kukit.E);
    }
    return binderInfo;
};

this.startBindingPhase = function () {
    // At the end of the binding phase, we want to process our events. This
    // must include all the binder instances we bound in this phase.
    for (var id in this.info) {
        var binderInfo = this.info[id];
        // process binding on this instance.
        binderInfo.startBindingPhase();
    }
};

this.processBindingEvents = function () {
    // At the end of the binding phase, we want to process our events. This
    // must include all the binder instances we bound in this phase.
    for (var id in this.info) {
        var binderInfo = this.info[id];
        // process binding on this instance.
        binderInfo.processBindingEvents();
    }
};
this.initialize.apply(this, arguments);
};

/*
* class _BinderInfo
*
* Information about the given binder instance. This contains the instance and
* various binding info. Follows the workflow of the binding in different stages.
*
*/
var _BinderInfo = function() {

this.initialize = function(binder) {
    this.binder = binder;
    this.bound = new _OperRegistry();

    this.getBinder = function () {
        return this.binder;
    };

    this.startBindingPhase = function () {
        // The binding phase starts and it has the information for
        // the currently on-bound events.
        this.binding = new _OperRegistry();
    };

    this.bindOper = function (oper) {
        // We mark a given oper. This means a binding on the binder 
        // for given event, node and eventRule (containing event namespace,
        // name, and evt- parms.)
        //
        // first see if it can go to already bound ones
        this.bound.checkOperBindable(oper);
        // then register it properly to the binding events
        this.binding.bindOper(oper);
    };

    this.processBindingEvents = function () {
        // We came to the end of the binding phase. Now we process all our binding
        // events, This will do the actual binding on the browser side.
        this.binding.processBindingEvents(this.binder);
        // Now we to add these to the new ones.
        this.binding.propagateTo(this.bound);
        // Delete them from the registry, to protect against accidents.
        this.binding = null;
    };

    this.startBindingPhase();
};

this.getBinder = function () {
    return this.binder;
};

this.startBindingPhase = function () {
    // The binding phase starts and it has the information for
    // the currently on-bound events.
    this.binding = new _OperRegistry();
};

this.bindOper = function (oper) {
    // We mark a given oper. This means a binding on the binder 
    // for given event, node and eventRule (containing event namespace,
    // name, and evt- parms.)
    //
    // first see if it can go to already bound ones
    this.bound.checkOperBindable(oper);
    // then register it properly to the binding events
    this.binding.bindOper(oper);
};

this.processBindingEvents = function () {
    // We came to the end of the binding phase. Now we process all our binding
    // events, This will do the actual binding on the browser side.
    this.binding.processBindingEvents(this.binder);
    // Now we to add these to the new ones.
    this.binding.propagateTo(this.bound);
    // Delete them from the registry, to protect against accidents.
    this.binding = null;
};
this.initialize.apply(this, arguments);
};

var _iterators = {};

    // This calls the bind method by each bound oper one by one.
    // Eventname and funcToBind are passed too.
    // this is the legacy ([EachLegacy]) way
    _iterators['EachLegacy'] = 
        function (eventSet, binder) {
        for (var i=0; i<eventSet.names.length; i++) {
            var rulesPerName = this.infoPerName[eventSet.names[i]];
            if (typeof(rulesPerName) != 'undefined') {
                for (var nodeHash in rulesPerName) {
                    var oper = rulesPerName[nodeHash];
                    var eventName = oper.getEventName();
                    var funcToBind = oper.makeExecuteActionsHook();
                    this.callBindMethod(eventSet, binder, eventName,
                        funcToBind, oper);
                }
            }
        }
    };

    // This calls the bind method by each bound oper one by one.
    // Eventname and funcToBind are passed too.
    // this is the preferred ([Each]) way. Parameters are different from EachLegacy.
    _iterators['Each'] = 
        function (eventSet, binder) {
        for (var i=0; i<eventSet.names.length; i++) {
            var rulesPerName = this.infoPerName[eventSet.names[i]];
            if (typeof(rulesPerName) != 'undefined') {
                for (var nodeHash in rulesPerName) {
                    var oper = rulesPerName[nodeHash];
                    this.callBindMethod(eventSet, binder, oper);
                }
            }
        }
    };

    // This calls the bind method by the list of bound opers
    _iterators['Opers'] = 
        function (eventSet, binder) {
        var opers = [];
        for (var i=0; i<eventSet.names.length; i++) {
            var rulesPerName = this.infoPerName[eventSet.names[i]];
            if (typeof(rulesPerName) != 'undefined') {
                for (var nodeHash in rulesPerName) {
                    opers.push(rulesPerName[nodeHash]);
                }
            }
        }
        this.callBindMethod(eventSet, binder, opers);
    };

    // This calls the bind method by a mapping eventName:oper
    // per each bound node individually
    _iterators['Node'] = 
        function (eventSet, binder) {
        for (var nodeHash in this.infoPerNode) {
            var rulesPerNode = this.infoPerNode[nodeHash];
            // filter only the events we are interested in
            var filteredRules = {};
            var operFound = false;
            for (var i=0; i<eventSet.names.length; i++) {
                var name = eventSet.names[i];
                var oper = rulesPerNode[name];
                if (typeof(oper) != 'undefined') {
                    filteredRules[name] = oper;
                    operFound = oper;
                }
            }
            // call it
            // All opers have the same node, the last one is yet in operFound, so
            // we use it as a second parameter to the call.
            // The method may or may not want to use this.
            if (operFound) {
                this.callBindMethod(eventSet, binder, filteredRules,
                    operFound.node);
            }
        }
    };

    // This calls the bind method once per instance, by a list of
    // items, where item.node is the node and item.opersByEventName nodeHash:item
    // in item there is item.node and item.opersByEventName
    _iterators['AllNodes'] = 
        function (eventSet, binder) {
        var items = [];
        var hasResult = false;
        for (var nodeHash in this.infoPerNode) {
            var rulesPerNode = this.infoPerNode[nodeHash];
            // filter only the events we are interested in
            var filteredRules = {};
            var operFound = false;
            for (var i=0; i<eventSet.names.length; i++) {
                var name = eventSet.names[i];
                var oper = rulesPerNode[name];
                if (typeof(oper) != 'undefined') {
                    filteredRules[name] = oper;
                    operFound = oper;
                }
            }
            if (operFound) {
                var item = {node: operFound.node, 
                    opersByEventName: filteredRules};
                items.push(item);
                hasResult = true;
            }
        }
        // call the binder method
        if (hasResult) {
            this.callBindMethod(eventSet, binder, items);
        }
    };

// Iterators
// The getBindIterator returns a function that gets executed on
// the oper registry.
//
// Iterators receive the eventSet as a parameter
// plus a binder and a method. They need to iterate by calling this
// as method.call(binder, ...); where ... can be any parms this
// given iteration specifies.
//

er.getBindIterator = function(iterName) {
    // attempt to find canonical version of string
    // and shout if it does not match.
    // String must start uppercase.
    var canonical = iterName.substring(0, 1).toUpperCase() + 
            iterName.substring(1);
    // Special case: allnodes -> AllNodes, not handled by
    // the previous line
    if (canonical == 'Allnodes') {
        canonical = 'AllNodes';
    }
    if (iterName != canonical) {
        // BBB 2007.12.31, this will turn into an exception.
        var msg = 'Deprecated the lowercase iterator names in last ';
        msg += 'parameters of ';
        msg += 'kukit.eventsGlobalRegistry.registerForAllEvents, use [';
        msg += canonical + '] instead of [' + iterName + '] (2007-12-31)';
        kukit.logWarning(msg);
        iterName = canonical;
        }
    return _iterators[iterName];
};

/*
* class _OperRegistry
*
* OperRegistry is associated with a binder instance in the 
* BinderInfoRegistry, and remembers bounding information.
* This is used both to remember all the bindings for a given
* instance, but also just to remember the bindings done during
* a given event setup phase.
*
*/
var _OperRegistry = function() {

this.initialize = function() {
    this.infoPerName = {};
    this.infoPerNode = {};
};

// XXX we can do this without full cloning, more efficiently.
this.propagateTo = function (newreg) {
    for (var key in this.infoPerName) {
        var rulesPerName = this.infoPerName[key];
        for (var name in rulesPerName) {
            var oper = rulesPerName[name];
            newreg.bindOper(oper);
        }
    }
};

this.checkOperBindable =
    function (oper, name, nodeHash) {
    // Check if the binding with this oper could be done.
    // Throw exception otherwise.
    //
    // Remark. We need  different check and bind method,
    // because we need to bind to the currently
    // processed nodes, but we need to check duplication 
    // in all the previously bound nodes.
    var info = this.infoPerName;
    // name and nodeHash are for speedup.
    if (typeof(nodeHash) == 'undefined') {
        name = oper.eventRule.kssSelector.name;
        nodeHash = kukit.rd.hashNode(oper.node);
    }
    var rulesPerName = info[name];
    if (typeof(rulesPerName) == 'undefined') {
        // Create an empty list.
        rulesPerName = info[name] = {};
    } else if (typeof(rulesPerName[nodeHash]) != 'undefined') {
        kukit.E = 'Mismatch in bind registry,[ ' + name;
        kukit.E += '] already bound to node in this instance.'; 
        throw new Error(kukit.E);
    }
    return rulesPerName;
};
    
this.bindOper = function (oper) {
    // Marks binding between binder, eventName, node.
    var name = oper.eventRule.kssSelector.name;
    var nodeHash = kukit.rd.hashNode(oper.node);
    var rulesPerName = this.checkOperBindable(oper, name, nodeHash);
    rulesPerName[nodeHash] = oper;
    // also store per node info
    var rulesPerNode = this.infoPerNode[nodeHash];
    if (typeof(rulesPerNode) == 'undefined') {
        // Create an empty list.
        rulesPerNode = this.infoPerNode[nodeHash] = {};
    }
    rulesPerNode[name] = oper;
};

// XXX This will need refactoring.
/// We would only want to lookup from our registry and not the other way around.
this.processBindingEvents = 
    function (binder) {
    var eventRegistry = kukit.eventsGlobalRegistry;
    for (var i=0; i < eventRegistry.eventSets.length; i++) {
        var eventSet = eventRegistry.eventSets[i];
        // Only process binding events (and ignore non-binding ones)
        if (eventSet.bindMethodName) {
            if (binder.__eventNamespace__ == eventSet.namespace) {
                // Process the binding event set.
                // This will call the actual bindmethods
                // according to the specified iterator.
                var iterator = er.getBindIterator(eventSet.iterName);
                iterator.call(this, eventSet, binder);
            }
        }
    }
};

// XXX The following methods will probably disappear as iterators 
// replace their functionality.

this.getBoundOperForNode = function (name, node) {
    // Get the oper that is bound to a given eventName
    // to a node in this binder
    // returns null, if there is no such oper.
    var rulesPerName = this.infoPerName[name];
    if (typeof(rulesPerName) == 'undefined') {
        return null;
    }
    var nodeHash = kukit.rd.hashNode(node);
    var oper = rulesPerName[nodeHash];
    if (typeof(oper) == 'undefined') {
        return null;
    }
    // Return it
    return oper;
};

this.getBoundOpers = function (name) {
    // Get the opers bound to a given eventName (to any node)
    // in this binder
    var opers = [];
    var rulesPerName = this.infoPerName[name];
    if (typeof(rulesPerName) != 'undefined') {
        // take the values as a list
        for (var nodeHash in rulesPerName) {
            opers.push(rulesPerName[nodeHash]);
        }
    }
    // Return it
    return opers;
};

this.callBindMethod = 
    function (eventSet, binder, p1, p2, p3, p4, p5, p6) {
    var method = binder[eventSet.bindMethodName];
    // Protect the binding for better logging
    try {
        method.call(binder, p1, p2, p3, p4, p5, p6);
    } catch(e) {
        var names = eventSet.names;
        var namespace = eventSet.namespace;
        kukit.E = kukit.err.eventBindError(e, names, namespace);
        throw new Error(kukit.E);
    }
};
this.initialize.apply(this, arguments);
};

er.makeId = function(namespace, name) {
    if (namespace == null) {
        namespace = '';
    }
    return '@' + namespace + '@' + name;
};

er.makeMergeId = function(id, namespace, name) {
    if (namespace == null) {
        namespace = '';
    }
    return id + '@' + namespace + '@' + name;
};

}();                              /// MODULE END

/*
* Copyright (c) 2005-2007
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

kukit.ar = new function() {   /// MODULE START

var ar = this;
 
/*
*  class actionregistry
* 
*  the local event actions need to be registered here.
*/
var _ActionRegistry = function () {
this.initialize = function() {
    this.content = {};
};

this.register = function(name, func) {
    if (typeof(func) == 'undefined') {
        kukit.e = '[func] argument is mandatory when registering an action';
        kukit.e += ' [actionregistry.register].';
        throw new Error(kukit.e);
    }
    if (this.content[name]) {
        // do not allow redefinition
        kukit.logError('error : action [' + name + '] already registered.');
        // XXX XXX We actually do allow it with a red warning now! (???)
        return;
        }
    this.content[name] = func;
};

this.exists = function(name) {
    var entry = this.content[name];
    return (typeof(entry) != 'undefined');
};

this.get = function(name) {
    var func = this.content[name];
    if (! func) {
        // not found
        kukit.E = 'Error : undefined local action [' + name + '].';
        throw Error(kukit.E);
        }
    return func;
};
this.initialize.apply(this, arguments);
};


kukit.actionsGlobalRegistry = new _ActionRegistry();

/* XXX deprecated methods, to be removed asap */

ar.actionRegistry = function() {
    this.register = function(name, func) {
       var msg='Deprecated kukit.ar.actionRegistry.register, use ';
       msg += 'kukit.actionsGlobalRegistry.register instead !';
       kukit.logWarning(msg);
        kukit.actionsGlobalRegistry.register(name, func);
    };
};

}();                              /// MODULE END


/*
* Copyright (c) 2005-2007
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

/* Generic dom helpers */

kukit.dom = new function() {   /// MODULE START
 
var dom = this;

dom.getPreviousSiblingTag = function(node) {
    var toNode = node.previousSibling;
    while ((toNode != null) && (toNode.nodeType != 1)) {
        toNode = toNode.previousSibling;
    }
    return toNode;
};

dom.getNextSiblingTag = function(node) {
    var toNode = node.nextSibling;
    while ((toNode != null) && (toNode.nodeType != 1)) {
        toNode = toNode.nextSibling;
    }
    return toNode;
};

dom.insertBefore = function(nodes, parentNode, toNode) {
    for(var i=0; i<nodes.length; i++) {
        parentNode.insertBefore(nodes[i], toNode);
    }
};

dom.appendChildren = function(nodes, toNode) {
    for(var i=0; i<nodes.length; i++) {
        toNode.appendChild(nodes[i]);
    }
};

dom.clearChildNodes = function(node) {
    //XXX Maybe we want to get rid of sarissa once?
    Sarissa.clearChildNodes(node);
};

dom.parseHTMLNodes = function(txt){
    var node = document.createElement('div');
    node.innerHTML = txt;
    var resultNodes = [];
    for (var i=0; i<node.childNodes.length; i++) {
        resultNodes.push(node.childNodes.item(i));
    }
    return resultNodes;
};

/*
*  really the query should start from the document root, but
*  limited to inNodes subtrees!
*/

dom.cssQuery = function(selector, inNodes) {
    // to eliminate possible errors
    if (typeof(inNodes) != 'undefined' && inNodes == null) {
       kukit.E = 'Selection error in kukit.dom.cssQuery';
        throw new Error(kukit.E);
    }
    return _cssQuery(selector, inNodes);
};

/*
 * Decide which query to use
 */

var _USE_BASE2 = (typeof(base2) != 'undefined');
if (_USE_BASE2) {
    // Base2 legacy version: matchAll has to be used
    // Base2 recent version: querySelectorAll has to be used
    var _USE_BASE2_LEGACY = (typeof(base2.DOM.Document.querySelectorAll) == 'undefined');
    if (! _USE_BASE2_LEGACY) {
        kukit.log('Using cssQuery from base2.');
        var _cssQuery = function(selector, inNodes) {
            // global scope, always.
            // This is very bad. However the binding makes sure that
            // nodes once bound will never be bound again
            // (also, noticed the following issue: cssQuery, when called
            // on an element, does not check the element itself.)
            var results = base2.DOM.Document.querySelectorAll(document, selector);
            var nodes = [];
            for(var i = 0; i < results.length; i++) {
                nodes.push(results.item(i));
            }
            return nodes;
        };
    } else {
        kukit.log('Using cssQuery from base2. (Using legacy API document.matchAll)');
        var _cssQuery = function(selector, inNodes) {
            // global scope, always.
            // This is very bad. However the binding makes sure that
            // nodes once bound will never be bound again
            // (also, noticed the following issue: cssQuery, when called
            // on an element, does not check the element itself.)
            var results = base2.DOM.Document.matchAll(document, selector);
            var nodes = [];
            for(var i = 0; i < results.length; i++) {
                nodes.push(results.item(i));
            }
            return nodes;
        };
    }
} else {
   kukit.log('Using original cssQuery.');
    var _cssQuery = function(selector, inNodes) {
        // global scope, always.
        // This is very bad. However the binding makes sure that
        // nodes once bound will never be bound again
        // (also, noticed the following issue: cssQuery, when called
        // on an element, does not check the element itself.)
        var results = cssQuery(selector);
        return results;
    };
};

dom.focus = function(node) {
    tagName = node.tagName.toLowerCase();
    if ((tagName == 'input') || (tagName == 'select')
       || (tagName == 'textarea')) {
        node.focus();
   } else {
       kukit.logWarning('Focus on node that cannot have focus !');
    };
};

dom.blur = function(node) {
    tagName = node.tagName.toLowerCase();
    if ((tagName == 'input') || (tagName == 'select')
       || (tagName == 'textarea')) {
        node.blur();
   } else {
       kukit.logWarning('Blur on node that cannot be blurred !');
    };
};

/*
*  Gets the textual content of the node
*  if recursive=false (default), does not descend into sub nodes
*/
dom.textContent = function(node, recursive) {
    var value = _textContent(node, recursive);
    // replace newline with spaces
    value = value.replace(/\r\n/g, ' ');
    value = value.replace(/[\r\n]/g, ' ');
    return value;
};

var _textContent = function(node, recursive) {
    if (typeof(recursive) == 'undefined') {
        recursive = false;
    }
    var value = '';
    var childnodes = node.childNodes;
    for (var i=0; i<childnodes.length; i++) {
        var child = childnodes[i];
        if (child.nodeType == 3) {
            // Only process text nodes
            value += child.nodeValue;
        } else if (recursive && child.nodeType == 1) {
            // recurr into element nodes
            value += dom.textContent(child, true);
        }
    }
    return value;
};

/* Getting and setting node attibutes 
   We need to provide workarounds for IE.
*/

dom.getAttribute = function(node, attrname) {
    if (attrname.toLowerCase() == 'style') {
        throw new Error('Style attribute is not allowed with getAttribute');
    }
   if (typeof(attrname) != 'string') {
       throw new Error('value error : attrname must be string');
   }
    // The code hereunder does not work for kssattr:xxx args
    // var value = node[argname];

    // try catch is needed in some cases on IE
    try {
        var value = node.getAttribute(attrname);
    }
    catch(e) {
        var value = null;
    }
    if (! value) {
        // Workarounds, in case we have not found above
        if (attrname.toLowerCase() == 'class') {
            // for IE
            value = node.className;
        } else if (attrname.toLowerCase() == 'for') {
            // for IE
            value = node.htmlFor;
        }
    }
    return value;
    // XXX We cannot distinguish between notfound and '', unfortunately
};

dom.setAttribute = function(node, attrname, value) {
    if (attrname.toLowerCase() == 'style') {
        throw new Error('Style attribute is not allowed with setAttribute');
    }
    else if (attrname.toLowerCase() == 'class') {
        // The class attribute cannot be set on IE, instead
        // className must be used. However node.className = x
        // works on both IE and FF.
        node.className = value;
    } else if (attrname.toLowerCase() == 'for') {
        // On IE, workaround is needed. Since I am not sure, I use both methods.
        node.htmlFor = value;
        node.setAttribute(attrname, value);
    } else if (attrname.toLowerCase() == 'value') {
        node.value = value;
    } else if (attrname.toLowerCase() == 'checked') {
        // we need to convert this to boolean.
        value = ! (value == '' || value == 'false' || value == 'False');
        node.checked = value;
    } else {
        node.setAttribute(attrname, value);
    }
};


/* KSS attributes: a workaround to provide attributes
   in our own namespace.
   Since namespaced attributes (kss:name="value") are not allowed
   even in transitional XHTML, we must provide a way to
   substitute them. This is achieved by putting kssattr-name-value
   identifiers in the class attribute, separated by spaces.
   We only read these attributes, writing happens
   always in the kss namespace.
   XXX at the moment, deletion can be achieved with setting with
   a value ''. This is consistent with DOM behaviour as we seem to
   be getting '' for nonexistent values anyway.
*/

var _kssAttrNamespace = 'kssattr';

// the namespace prefix for kss values, 
// i.e.:
//              class="... kss-attr-key-value..."
//              id=="kss-id-key-value"
// (XHTML:)     kss-attr:key-value 
//
var _kssNamespacePrefix = 'kss';

var _getKssValueFromEncodings = function(encodings, prefix) {
    // Value us a list of values.
    // If a value equals prefix-value, it will find it
    // and return the value after the prefix and the dash.
    // (First value found will be returned.)
    //
    // For example:
    //
    //     _getKssValueFromEncodings(['kss-attr-key1-value1', 'kss-attr-key2-value2',
    //          'kss-id-key1-value1'], "kss-attr-key1')
    //
    // results 'value1'.
    //
    // Legacy example:
    //
    //    _getKssValueFromEncodings(['kssattr-key1-value1', 'kssatt-rkey2-value2'], 
    //          "kss-attr-key1')
    //
    //  results 'value1'.
    //
    prefix = prefix + '-';
    var prefixLength = prefix.length;
    for (var i=0; i<encodings.length; i++) {
        var encoding = encodings[i];
        // Does the value start with the prefix?
        if (encoding.substr(0, prefixLength) == prefix) {
            // Found it.
            return encoding.substr(prefixLength);
        }
    }
    return null;
};

// BBB hint: used by getKssAttribute only, for providers
// kssAttr and  currentFormVarForKssAttr.
var _getKssClassAttribute = function(node, attrname) {
    // Gets a given kss attribute from the class
    var klass = dom.getAttribute(node, 'class');
    if (klass) {
        var splitclass = klass.split(/ +/);
        return _getKssValueFromEncodings(splitclass, 'kssattr-' + attrname);
    }
    return null;
};

dom.getKssAttribute = function(node, attrname) {
    // Gets a given kss attribute 
    // first from the namespace, then from the class
    var fullName = _kssAttrNamespace + ':' + attrname;
    var result = dom.getAttribute(node, fullName);
    // XXX if this was '' it is the same as notfound,
    // so it shadows the class attribute!
    // This means setting an attribute to '' is the same as deleting it - 
    // at least at the moment
    if (! result) {
        result = _getKssClassAttribute(node, attrname);
    }
    return result;
};

dom.setKssAttribute = function(node, attrname, value) {
    // Sets a given kss attribute on the namespace
    var fullName = _kssAttrNamespace + ':' + attrname;
    dom.setAttribute(node, fullName, value);
};

/* 
 * Handling of kss values
 */

dom.getKssValue = function(node, keyType, key) {
    // Gets a given kss value
    // first try from the namespace (XHTML), then from the class and id
    var namespacedName = _kssNamespacePrefix + '-' + keyType;
    // We access node.getAttribute directly, because we don't need the
    // other checks in dom.getAttribute
    var attrName = namespacedName + ':' + key;
    var result = node.getAttribute(attrName);
    // XXX if this was '' it is the same as notfound,
    // so it shadows the class attribute!
    // This means setting an attribute to '' is the same as deleting it - 
    // at least at the moment
    if (! result) {
        // Make sure result is null, in case we can't produce one
        // below.
        result = null;
        // Now try to get it from the class and id encodings.
        // Having it in the id gives the advantage that we can use
        // kss-id-key-value both as a unique html id, and widget markup.
        var klass = dom.getAttribute(node, 'class');
        var encodings;
        if (klass) {
            encodings = klass.split(/ +/);
        } else {
            encodings = [];
        }
        var id = dom.getAttribute(node, 'id');
        if (id) {
            // We have an id, consider it too
            // id will be inserted 1st, ie. it overrides possible doubles in classes
            encodings.unshift(id);
        }
        // Get the result-
        var prefix = namespacedName + '-' + key;
        return _getKssValueFromEncodings(encodings, prefix);
    }
    return result;
};

dom.setKssValue = function(node, keyType, key, value) {
    // Sets a given kss attribute on the namespace
    var namespacedName = _kssNamespacePrefix + '-' + keyType;
    // We access node.setAttribute directly, because we don't need the
    // other checks in dom.setAttribute
    var attrName = namespacedName + ':' + key;
    node.setAttribute(attrName, value);
};


/* Recursive query of node attributes
   getter is a function that gets the value from the node.
*/

dom.locateMarkup =
    function(node, recurseParents, getter, p1, p2, p3, p4, p5) {
    var value = getter(node, p1, p2, p3, p4, p5);
    var element = node;
    if (recurseParents) {
        // need to recurse even if value="" !
        // We cannot figure out if there exists
        // and attribute in a crossbrowser way, or it is set to "".
        while (! value) {
            element = element.parentNode;
            if (! element || ! element.getAttribute) {
                break;
            }
            value = getter(element, p1, p2, p3, p4, p5);
        }
    } 
    if (typeof(value) == 'undefined') {
        // notfound arguments will get null
        value = null;
    }
    // We return both the value and the node where
    // it was found.
    return {value:value, node:element};
};

dom.getRecursiveAttribute =
    function(node, attrname, recurseParents, getter) {
    return dom.locateMarkup(node,
            recurseParents, getter, attrname).value;
};

/*
* From /web/20141223044707/http://xkr.us/articles/dom/iframe-document/
* Note it's not necessary for the iframe to have the name
* attribute since we don't access it from window.frames by name.
*/
var _getIframeDocument = function(framename) {
    var iframe = document.getElementById(framename);
    var doc = iframe.contentWindow || iframe.contentDocument;
    if (doc.document) {
        doc = doc.document;
    }
    return doc;
};

/*
*  class EmbeddedContentLoadedScheduler
*
*  Scheduler for embedded window content loaded
*/
dom.EmbeddedContentLoadedScheduler = function() {

this.initialize = function(framename, func, autodetect) {
    this.framename = framename;
    this.func = func;
    this.autodetect = autodetect;
    var self = this;
    var f = function() {
        self.check();
    };
    this.counter = new kukit.ut.TimerCounter(250, f, true);
    // check immediately.
    //this.counter.timeout();
    // XXX can't execute immediately, it fails on IE.
    this.counter.start();
};

this.check = function() {
    
    kukit.logDebug('Is iframe loaded ?');
    
    var doc = _getIframeDocument(this.framename);

    // quit if the init function has already been called
    // XXX I believe we want to call the function too, then
    // XXX attribute access starting with _ breaks full compression,
    // even in strings
    //if (doc._embeddedContentLoadedInitDone) {
    if (doc['_' + 'embeddedContentLoadedInitDone']) {
        var msg = 'Iframe already initialized, but we execute the action';
        msg += ' anyway, as requested.';
        kukit.logWarning(msg);
        this.counter.restart = false;
    }

    // autodetect=false implements a more reliable detection method
    // that involves cooperation from the internal document. In this
    // case the internal document sets the _kssReadyForLoadEvent attribute
    // on the document, when loaded. It is safe to check for this in any 
    // case, however if this option is selected, we rely only on this, 
    // and skip the otherwise problematic default checking.
    // XXX attribute access starting with _ breaks full compression,
    // even in strings
    //if (typeof doc._kssReadyForLoadEvent != 'undefined') {
    if (typeof doc['_' + 'kssReadyForLoadEvent'] != 'undefined') {
        this.counter.restart = false;
    } 

    if (this.autodetect && this.counter.restart) {

        // obviously we are not there... this happens on FF
        if (doc.location.href == 'about:blank') {
            return;
        } /* */
        
        // First check for Safari or
        // if DOM methods are supported, and the body element exists
        // (using a double-check including document.body,
        // for the benefit of older moz builds [eg ns7.1] 
        // in which getElementsByTagName('body')[0] is undefined,
        // unless this script is in the body section)
        
        if(/KHTML|WebKit/i.test(navigator.userAgent)) {
            if(/loaded|complete/.test(doc.readyState)) {
                this.counter.restart = false;
            }
        } else if(typeof doc.getElementsByTagName != 'undefined'
            && (doc.getElementsByTagName('body')[0] != null ||
                doc.body != null)) {
            this.counter.restart = false;
        } /* */

    }

    if ( ! this.counter.restart) {
        kukit.logDebug('Yes, iframe is loaded.');
        // XXX attribute access starting with _ breaks full compression,
        // even in strings
        // doc._embeddedContentLoadedInitDone = true;
        doc['_' + 'embeddedContentLoadedInitDone'] = true;
        this.func();
    }
};
this.initialize.apply(this, arguments);
};

dom.getNsTags = function(dom_obj, tagName) {
    // Now, all the document is in the kukit namespace,
    // so we just access them by tagname.
    tags = dom_obj.getElementsByTagName(tagName);
    return tags;
};

var _hasClassName = function(node, class_name) {
    return new RegExp('\\b'+class_name+'\\b').test(node.className);
};

dom.addClassName = function(node, class_name) {
    if (!node.className) {
        node.className = class_name;
    } else if (!_hasClassName(node, class_name)) {
        var className = node.className+" "+class_name;
        // cleanup
        node.className = className.split(/\s+/).join(' ');
    }
};

dom.removeClassName = function(node, class_name) {
    var className = node.className;
    if (className) {
        // remove
        className = className.replace(new RegExp('\\b'+class_name+'\\b'), '');
        // cleanup
        className = className.replace(/\s+/g, ' ');
        node.className = className.replace(/\s+$/g, '');
    }
};


/*
 * Cookie handling code taken from: 
 * /web/20141223044707/http://www.quirksmode.org/js/cookies.html
 */

dom.createCookie = function(name, value, days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        var expires = "; expires=" + date.toGMTString();
    }
    else var expires = "";
    document.cookie = name + "=" + value + expires + "; path=/";
};

// we get this from kukit utils.js. We needed an early
// definition there, because logging is needed from the
// very beginning.
dom.readCookie = kukit.readCookie;

dom.eraseCookie = function(name) {
    createCookie(name, "", -1);
};

}();                              /// MODULE END


/*
* Copyright (c) 2005-2007
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

/* Command registration */

kukit.cr = new function() {   /// MODULE START

var cr = this;

/*
*  class _CommandRegistry
*/
var _CommandRegistry = function () {

this.initialize = function() {
    this.commands = {};
};

this.registerFromAction =
    function(srcname, factory, name) {
    if (typeof(name) == 'undefined') {
        // allows to set a different name as the action name,
        // usable for backward
        // compatibility setups
        name = srcname;
    }
    // register a given action as a command, using the given vactor
    var f = kukit.actionsGlobalRegistry.get(srcname);
    factory(name, f);
};

this.register = function(name, klass) {
    if (this.commands[name]) {
        // Do not allow redefinition
        var msg = 'ValueError : command [' + name + '] is already registered.';
        kukit.logError(msg);
        return;
        }
    this.commands[name] = klass;
};

this.get = function(name) {
    var klass = this.commands[name];
    if (! klass) {
        // not found
        var msg = 'ValueError : no command registered under [' + name + '].';
        kukit.logError(msg);
       }
    return klass;
};
this.initialize.apply(this, arguments);
};

/* 
* This is the proposed way of registration, as we like all commands to be
*  client actions first.
* 
*  Examples:
* 
*  kukit.actionsGlobalRegistry.register('log', f1);
*  kukit.commandsGlobalRegistry.registerFromAction('log',
*       kukit.cr.makeGlobalCommand);
* 
*  kukit.actionsGlobalRegistry.register('replaceInnerHTML', f2);
*  kukit.commandsGlobalRegistry.registerFromAction('replaceInnerHTML',
*       kukit.cr.makeSelectorCommand);
*/
kukit.commandsGlobalRegistry = new _CommandRegistry();


/* XXX deprecated methods, to be removed asap */

cr.commandRegistry = {};
cr.commandRegistry.registerFromAction = function(srcname, factory, name) {
   var msg = 'Deprecated kukit.cr.commandRegistry.registerFromAction,';
   msg += ' use kukit.commandsGlobalRegistry.registerFromAction instead! (';
   msg += srcname + ')';
   kukit.logWarning(msg);
    kukit.commandsGlobalRegistry.registerFromAction(srcname, factory, name);
};

/* Command factories */

cr.makeCommand = function(selector, name, type, parms, transport) {
    var commandClass = kukit.commandsGlobalRegistry.get(name);
    var command = new commandClass();
    command.selector = selector;
    command.name = name;
    command.selectorType = type;
    command.parms = parms;
    command.transport = transport;
    return command;
};

var _executeCommand = function(oper) {
    var newoper = oper.clone({
        'parms': this.parms,
        'orignode': oper.node,
        'node': null
        });
    this.executeOnScope(newoper);
};

var _executeCommandOnSelector = function(oper) {
    // if the selector type is null or undefined or '',
    // we use the default type.
    var selectorType = this.selectorType || 
                       kukit.selectorTypesGlobalRegistry.defaultSelectorType;
    // Use the provider registry to look up the selection provider.
    var providerClass = kukit.pprovidersGlobalRegistry.get(selectorType);
    // See if if is really a selection provider.
    if (providerClass.prototype.returnType != 'selection') {
        kukit.E = 'Undefined selector type [' + selectorType + '], ';
        kukit.E = 'it exists as provider but it does not return a selection.';
        throw new Error(kukit.E);
    }
    // Instantiate it
    var provider = new providerClass();
    var args = [this.selector];
    // Check the provider first.
    provider.check(args);
    // When evaluating the provider, the original event target will be used
    // as a starting point for the selection.
    // args will contain a single item, since the server side currently
    // cannot marshall selectors with more parameters
    // defaultParameters will be empty when using from commands.
    var nodes = provider.eval(args, oper.orignode, {});
    //
   var printType;
   if (this.selectorType) {
       printType = this.selectorType;
   } else {
       printType = 'default (';
       printType += kukit.selectorTypesGlobalRegistry.defaultSelectorType;
       printType += ')';
   }
   var msg = 'Selector type [' + printType + '], selector [';
   msg += this.selector + '], selected nodes [' + nodes.length + '].';
   kukit.logDebug(msg);
   if (!nodes || nodes.length == 0) {
       kukit.logWarning('Selector found no nodes.');
   }
    for (var i=0;i < nodes.length;i++) {
        oper.node = nodes[i];
        //XXX error handling for wrong command name
       kukit.logDebug('[' + this.name + '] execution.');
        this.executeOnSingleNode(oper);
    }
};

cr.makeSelectorCommand = function(name, executeOnSingleNode) {
    var commandClass = function() {
        this.execute = _executeCommand;
        this.executeOnScope = _executeCommandOnSelector;
        this.executeOnSingleNode = executeOnSingleNode;
        };
    kukit.commandsGlobalRegistry.register(name, commandClass); 
};

cr.makeGlobalCommand = function(name, executeOnce) {
    var commandClass = function() {
        this.execute = _executeCommand;
        this.executeOnScope = executeOnce;
        this.executeOnSingleNode = executeOnce;
        };
    kukit.commandsGlobalRegistry.register(name, commandClass); 
};

}();                              /// MODULE END


/*
* Copyright (c) 2005-2007
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

kukit.sa = new function() {   /// MODULE START

var sa = this;

// ServerActionBase is a non-initialize version of ServerAction
// this enables to subclass it or reuse its methods
sa.ServerActionBase = function() {

this.initialize = function(name, oper) {
    this.oper = oper;
    this.url = oper.kssParms.kssUrl;
    if (typeof(this.url) == 'undefined') {
        this.url = name;
    }
    this.url = this.calculateAbsoluteURL(this.url);
    this.notifyServer();
};

/* 
 * calculateAbsoluteURL
 *
 * Makes absolute site url
 * - if starts with http:// https:// : no change
 * - if starts with /: interprets absolute from domain
 * - otherwise: relative to current context
 */
this.calculateAbsoluteURL = function(url) {
    // XXX packer breaks on following regexp constant,
    // so it must be quoted
    if (url.match(RegExp("/^https?:\/\//"))) {
        // absolute already
        return url;
    }
    var absoluteMatch = url.match(RegExp(/^(\/)(.*)/));
    var path = kukit.engine.baseUrl;
    if (absoluteMatch) {
        // relative to domain
        var base = path.match(RegExp(/^(.*:\/\/[^\/]*)(\/?)/))[1];
        // base is like: /web/20141223044707/http://foo.bar without trailing /
        url = base + url;
        return url;
    }
    // final case: relative to current url
    // (paranoia: add an / to the path *only* if it is
    // *not* there) 
    // XXX packer breaks on following
    // regexp constant, so it must be quoted
    if (! path.match(RegExp("/$"))) {
        path += '/';
    }
    url = path + url;
    return url;
};

// Backparameters can be used on command execution.
this.notifyServer = function() {
    var self = this;
    var sendHook = function(queueItem) {
        // store the queue reception on the oper
        self.oper.queueItem = queueItem;
        self.reallyNotifyServer();
    };
    var timeoutHook = function(queueItem) {
        // store the queue reception on the oper
        self.oper.queueItem = queueItem;
        self.processError('timeout');
    };
    kukit.engine.requestManager.notifyServer(sendHook, this.url, timeoutHook);
};

this.reallyNotifyServer = function() {
    // make a deferred callback
    var domDoc = new XMLHttpRequest();
    var self = this;
    var notifyServer_done  = function() {
        self.notifyServer_done(domDoc);
    };
    // convert params
    var query = new kukit.fo.FormQuery();
    for (var key in this.oper.parms) {
        query.appendElem(key, this.oper.parms[key]);
    }
    // also add the parms that result from submitting an entire form.
    // This is, unlike the normal parms, is a list. Keys and values are
    // added at the end of the query, without mangling names.
    var submitForm = this.oper.kssParms.kssSubmitForm;
    if (submitForm) {
        for (var i=0; i<submitForm.length; i++) {
            var item = submitForm[i];
            query.appendElem(item[0], item[1]);
        }
    }
    // encode the query
    var encoded = query.encode();
    // sending form
    var ts = new Date().getTime();
    //kukit.logDebug('TS: '+ts);
    var tsurl = this.url + "?kukitTimeStamp=" + ts;
    domDoc.open("POST", tsurl, true);
    domDoc.onreadystatechange = notifyServer_done;
    domDoc.setRequestHeader("Content-Type",
        "application/x-www-form-urlencoded");
    domDoc.send(encoded);
};

this.notifyServer_done = function(domDoc) {
//;;; var msg = 'Request readyState = ' + domDoc.readyState + '.';
//;;; kukit.logDebug(msg);
    if (domDoc.readyState == 4) {
        // notify the queue that we are done
        var success = this.oper.queueItem.receivedResult();
        // We only process if the response has not been timed
        // out by the queue in the meantime.
        if (success) {
            // catch the errors otherwise won't get logged.
            // In FF they seem to get swallowed silently.
            // We need these both in production and development mode,
            // since the erorr fallbacks are activated from processError.
            try {
                // process the results
                this.processResult(domDoc);
            } catch(e) {
                if (e.name == 'RuleMergeError' || e.name == 'EventBindError') {
                    throw kukit.err.eventSetupError(e);
                } 
                if (e.name == 'ResponseParsingError') {
                    kukit.E = 'Response parsing error: ' + e;
                    this.processError(kukit.E);
                } else if (e.name == 'ExplicitError') {
                    this.processError(e.info.kw.errorcommand);
                } else {
                    throw e;
                }
            }
        }
    };
};

this.processResult = function(domDoc) {
    // checking various dom process errors, and get the commands part
    var dom;
    var commandstags = [];
    // Let's process xml payload first:
    if (domDoc.responseXML) {
        dom = domDoc.responseXML;
        commandstags = kukit.dom.getNsTags(dom, 'commands');
        if (commandstags.length != 1) {
            // no good, maybe better luck with it as html payload
            dom = null;
        }
    }
    // Check for html too, this enables setting the kss error command on the 
    // error response.
    if (dom == null) {
        // Read the header and load it as xml, if defined.
        var payload = domDoc.getResponseHeader('X-KSSCOMMANDS');
        if (payload) {
            try {
                dom = (new DOMParser()).parseFromString(payload, "text/xml");
            } catch(e) {
                kukit.E = 'Error parsing X-KSSCOMMANDS header.';
                throw kukit.err.responseParsingError(kukit.E);
            }
            commandstags = kukit.dom.getNsTags(dom, 'commands');
            if (commandstags.length != 1) {
                // no good
                dom = null;
            }
        } else {
            // Ok. we have not found it either in the headers.
            // Check if there was a parsing error in the xml, 
            // and log it as reported from the dom
            // Opera <= 8.5 does not have the parseError attribute,
            // so check for it first
            dom = domDoc.responseXML;
            kukit.E = 'Unknown server error (invalid KSS response, no error';
            kukit.E += ' info received)';
            if (dom && dom.parseError && (dom.parseError != 0)) {
                kukit.E += ' : ' + Sarissa.getParseErrorText(dom);
                }
            throw kukit.err.responseParsingError(kukit.E);
        }
    };

    if (dom == null) {
        // this should not happen
        kukit.E = 'Neither xml nor html payload.';
        throw kukit.err.responseParsingError(msg);
    }
    // find the commands (atm we don't limit ourselves inside the commandstag)
    var commands = kukit.dom.getNsTags(dom, 'command');
    // Warning, if there is a valid response containing 0 commands.
    if (commands.length == 0) {
        kukit.log('No commands in kukit response');
        return;
    }
    // One or more valid commands to parse
    var command_processor = new kukit.cp.CommandProcessor();
    command_processor.parseCommands(commands, domDoc);
    kukit.engine.beginSetupEventsCollection();
    command_processor.executeCommands(this.oper);
    kukit.engine.finishSetupEventsCollection();
};

this.processError = function(errorcommand) {
    var error_action = null;
    if (this.oper.eventRule) {
        var error_action = this.oper.eventRule.actions.getErrorActionFor(
            this.oper.action);
        }
    var reason = '';
    if (typeof(errorcommand) == 'string') {
        // not a command, just a string
        reason = ', client_reason="' + errorcommand + '" ';
    } else if (typeof(errorcommand) != 'undefined') {
        // a real error command, sent by the server
        // as kukit payload.
        // this way the server sends whatever message he wants as a parameter
        // to the error command.
        reason = ', server_reason="' + errorcommand.parms.message + '" ';
    }
    if (error_action) {
        kukit.E = 'Request failed at url ' + this.oper.queueItem.url;
        kukit.E += ', rid=' + this.oper.queueItem.rid + reason;
        kukit.E += ', will be handled by action "' + error_action.name + '"';
        kukit.logWarning(kukit.E);
        // Individual error handler was defined. Execute it!
        error_action.execute(this.oper);
    } else {
        // Unhandled: just log it...
        kukit.E = 'Request failed at url ' + this.oper.queueItem.url;
        kukit.E += ', rid=' + this.oper.queueItem.rid + reason;
        kukit.logError(kukit.E);
        return;
        // in case of no logging, we would like to throw an error.
        // This means user will see something went wrong.
        // XXX But: throwing an error on Firefox
        // _seems to be ineffective__
        // and throwing the error from IE
        // _throws an ugly window, "Uncaught exception"
        // TODO figure out something?
    }
};

};

sa.ServerAction = function() {
    this.initialize.apply(this, arguments);
};
sa.ServerAction.prototype = new sa.ServerActionBase();

}();                              /// MODULE END

/*
* Copyright (c) 2005-2007
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

/* Request manager */

kukit.rm = new function() {   /// MODULE START

var rm = this;


/* Generation of an integer uid on request objects
*/

rm._rid = 0;

/*
* class _RequestItem
*
* Request item. Encapsulates the sendout function and data.
*/
var _RequestItem = function() {

this.initialize = function(sendHook, url, timeoutHook, timeout, now) {
    if (typeof(now) == 'undefined') {
        now = (new Date()).valueOf();
    }
    this.sent = now;
    this.expire = now + timeout;
    this.handled = false;
    this.sendHook = sendHook;
    this.url = url;
    this.timeoutHook = timeoutHook;
    // Generate a RID. Due to timeouting, we have enough
    // of these for not to overlap ever.
    this.rid = rm._rid;
    rm._rid ++;
    if (rm._rid >= 10000000000) {
        rm._rid = 0;
    }
};

this.callTimeoutHook = function() {
    // Calls the timeout hook for this item
    if (this.timeoutHook) {
        this.timeoutHook(this);
    }
};

this.setReceivedCallback = function(func) {
    // Sets the received callback function. It will be
    // called with the item as first parameter.
    this._receivedCallback = func;
};

this.receivedResult = function(now) {
    // This is called when the result response has arrived. It
    // returns a booolean value, if this is false, the caller
    // must give up processing the result that has been timed
    // out earlier.
    var result = this._receivedCallback(this, now);
    this._receivedCallback = null;
    return result;
}; 
this.initialize.apply(this, arguments);
};

rm.TestRequestItem = function() {
kukit.logWarning('Use class [rm.TestRequestItem] only in tests !');
this.initialize.apply(this, arguments);
};
rm.TestRequestItem.prototype = new _RequestItem();

/* 
* class _TimerQueue
*
* the send queue. This handles timeouts, and executes
* a callback for timed out items.
* Callback is called with the request item as parameter.
*/

var _TimerQueue = function() {

this.initialize = function(callback) {
    this.callback = callback;
    this.queue = new kukit.ut.SortedQueue(this._sentSort);
    this.count = 0;
};

this._sentSort = function(a, b) {
    // sorting of the sent queue, by expiration
    if (a.expire < b.expire) return -1;
    else if (a.expire > b.expire) return +1;
    else return 0;
};

this.push = function(item) {
    // push a given slot
    this.queue.push(item);
    this.count += 1;
};

this.pop = function(item) {
    // pop a given slot, return true if it was valid,
    // return false if it was already handled by timeout.
    // An object can be popped more times!
    if (typeof(item) == 'undefined' || item.handled) {
        return false;
    } else {
        item.handled = true;
        this.count -= 1;
        return true;
    }
};

this.handleExpiration = function(now) {
    if (typeof(now) == 'undefined') {
        now = (new Date()).valueOf();
    }
    var to;
    for (to=0; to<this.queue.size(); to++) {
        var item = this.queue.get(to);
        if (! item.handled) {
            if (item.expire > now) {
                break;
            } else {
                // call the callback for this element
                item.handled = true;
                this.count -= 1;
                this.callback(item);
            }
        }
    }
    // remove the elements from the queue
    this.queue.popn(to);
    // Returns when the next element will expire.
    var front = this.queue.front();
    var next_expire = null;
    if (front) {
        next_expire = front.expire;
    }
    return next_expire;
};
this.initialize.apply(this, arguments);
};

rm.TestTimerQueue = function() {
kukit.logWarning('Use class [rm.TestTimerQueue] only in tests !');
this.initialize.apply(this, arguments);
};
rm.TestTimerQueue.prototype = new _TimerQueue();


/* 
* class RequestManager
*/
rm.RequestManager = function () {

this.initialize = function (name, maxNr, schedulerClass, sendingTimeout) {
    // schedulerClass is mainly provided for debugging...
    this.waitingQueue = new kukit.ut.FifoQueue();
    this.sentNr = 0;
    var self = this;
    var timeoutItem = function(item) {
       self.timeoutItem(item);
    };
    this.timerQueue = new _TimerQueue(timeoutItem);
    if (typeof(name) == 'undefined') {
        name = null;
    }
    this.name = name;
    var nameString = '';
    if (name != null) {
        nameString = '[' + name + '] ';
        }
    this.nameString = nameString;
    // max request number
    if (typeof(maxNr) == 'undefined' || maxNr == null) {
        // Default is 4
        maxNr = 4;
    }
    this.maxNr = maxNr;
    // sets the timeout scheduler
    var checkTimeout = function() {
       self.checkTimeout();
    };
    if (typeof(schedulerClass) == 'undefined') {
        schedulerClass = kukit.ut.Scheduler;
    }
    this.timeoutScheduler = new schedulerClass(checkTimeout);
    this.spinnerEvents = {'off': [], 'on': []};
    this.spinnerState = false;
    // sending timeout in millisecs
    if (typeof(sendingTimeout) != 'undefined' && sendingTimeout != null) {
        this.sendingTimeout = sendingTimeout;
    }
};

    this.getInfo = function() {
        var msg = '(RQ: ' + this.sentNr + ' OUT, ' + this.waitingQueue.size();
        msg += ' WAI)';
        return msg;
    };

    this.log = function(txt) {
        var msg = 'RequestManager ' + this.nameString + txt + ' ';
        msg += this.getInfo() + '.';
        kukit.logDebug(msg);
    };

this.setSpinnerState = function(newState) {
    if (this.spinnerState != newState) {
        this.spinnerState = newState;
        // Call the registered spinner events for this state
        var events = this.spinnerEvents[newState ? 'on' : 'off'];
        for (var i=0; i<events.length; i++) {
            events[i]();
        }
    }
};

this.pushWaitingRequest = function(item, now) {
    this.waitingQueue.push(item);
    // Set the timeout
    this.checkTimeout(now);
};

this.popWaitingRequest = function() {
    var q = this.waitingQueue;
    // pop handled elements, we don't send them out at all
    while (! q.empty() && q.front().handled) {
        q.pop();
    }
    // return the element, or null if no more waiting!
    if (! q.empty()) {
        return q.pop();
    } else {
        return null;
    }
};

this.pushSentRequest = function(item, now) {
    this.sentNr += 1;
    this.log('notifies server ' + item.url + ', rid=' + item.rid);
    // Set the spinner state
    this.setSpinnerState(true);
    // Set the timeout
    this.checkTimeout(now);
    // Wrap up the callback func. It will be called
    // with the item as first parameter.
    var self = this;
    var func = function(item, now) {
        return self.receiveItem(item, now);
    };
    item.setReceivedCallback(func);
    // Call the function
    item.sendHook(item);
};

this.checkTimeout = function(now) {
    var nextWake = this.timerQueue.handleExpiration(now);
    if (nextWake) {
        // To make sure, add 50ms to the nextwake
        nextWake += 50;
        // do the logging
        //var now = (new Date()).valueOf();
        //this.log('Next timeout check in: ' + (nextWake - now));
    } else {
        this.log('suspends checking timeout until the next requests');
        // Set the spinner state
        this.setSpinnerState(false);
    }
    // do the scheduling
    this.timeoutScheduler.setNextWakeAtLeast(nextWake);
};

this.popSentRequest = function(item) {
    var success = this.timerQueue.pop(item);
    // We remove both to be processed, and timed out requests from the queue.
    // This means: possibly more physical requests are out, but this
    // is a better strategy in order not to hog the queue infinitely.
    this.sentNr -= 1;
    return success;
};

this.isSentRequestQueueFull = function() {
    return (this.sentNr >= this.maxNr);
};

this.receivedResult = function(item, now) {
    // called automatically when the result gets processed.
    // Mark that we have one less request out.
    var success = this.popSentRequest(item);
    // Independently of the success, this is the moment when we may
    // want to send out another item.
    var waiting = this.popWaitingRequest();
    if (waiting != null) {
        // see if we can send another request in place of the received one
        // request is waiting, send it.
        var msg = 'dequeues server notification at [' + waiting.url;
        msg += '], rid [' + waiting.rid + '].';
        this.log(msg);
        this.pushSentRequest(waiting, now);
    } else {
    //    this.log("Request queue empty.");
        // Set the spinner state
        this.setSpinnerState(false);
    }
    return success;
};


this.receiveItem = function(item, now) {
    // calls result processing
    var success = this.receivedResult(item, now);
    if (success) {
        this.log('received result with rid [' + item.rid + ']');
    } else {
        var msg = 'received timed out result rid [' + item.rid;
        msg += '], to be ignored';
        this.log(msg);
    }
    return success;
};

this.timeoutItem = function(item) {
    /* Time out this item. */
    this.log('timed out request rid [' + item.rid + ']');
    // Call the timeout hook on the item
    item.callTimeoutHook();
};

/* request manager notification API */

this.notifyServer =
    function(sendHook, url, timeoutHook, timeout, now) {
    // url is only for the logging
    // sendHook is the function that actually sends out the request.
    // sendHook will be called with one parameter: the 'item' array.
    // The sender mechanism must make sure to call item.receivedResult()
    // when it received the response.
    // Based on the return value of receivedResult(), the result processing
    // may go on or must be broken. If the return value is false, the
    // results must NOT be processed: this means that we have already
    // timed out the request by that time.
    // timeoutHook: can specify the timeouthook for this request.
    // Setting it to null
    // disables it. This will be called with the 'item' as a parameter as well.
    if (typeof(timeout) == 'undefined') {
        // Default value of timeout
        timeout = this.sendingTimeout;
    }
    var msg = 'Request timeout [' + timeout + '] milliseconds.';
    kukit.logDebug(msg);
    var item = new _RequestItem(sendHook, url, timeoutHook, timeout,
        now);
    // Start timing the item immediately
    this.timerQueue.push(item);
    if (! this.isSentRequestQueueFull()) {
        // can be sent if we are not over the limit.
        this.pushSentRequest(item, now);
    } else {
        this.pushWaitingRequest(item, now);
        var msg = 'queues server notification at [' + item.url;
        msg += '], rid [' + item.rid + ']';
        this.log(msg);
    }
};

this.registerSpinnerEvent = function(func, state) {
    this.spinnerEvents[state ? 'on' : 'off'].push(func);
};
this.initialize.apply(this, arguments);
};

// Default value of sending timeout in ms
rm.RequestManager.prototype.sendingTimeout = 8000;

}();                              /// MODULE END

/*
* Copyright (c) 2005-2007
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

kukit.cp = new function() {   /// MODULE START

var cp = this;

/*
* class CommandProcessor
*/
cp.CommandProcessor = function() {

this.initialize = function() {
    this.commands = new Array();
};

this.parseCommands = function(commands, transport) {
    kukit.log('Parsing commands.');
    kukit.logDebug('Number of commands : ' + commands.length + '.');
    for (var y=0;y < commands.length;y++) {
        var command = commands[y];
        this.parseCommand(command, transport);
        // If we receive an error command, we handle that separately.
        // We abort immediately and let the processError handler do its job.
        // This means that although no other commands should be in commands,
        // we make sure we execute none of them.
        var lastcommand = this.commands[this.commands.length-1];
        if (lastcommand.name == 'error') {
            // We have to throw an explicitError always, since we want
            // error fallbacks work both in production and development mode.
            throw kukit.err.explicitError(lastcommand);
        }
    }
};

this.parseCommand = function(command, transport) {
    var selector = "";
    var params = {};
    var name = "";

    selector = command.getAttribute("selector");
    name = command.getAttribute("name");
    type = command.getAttribute("selectorType");
    if (name == null)
        name = "";
    var childNodes = command.childNodes;
    for (var n=0;n < childNodes.length;n++) {
        var childNode = childNodes[n];
        if (childNode.nodeType != 1) 
            continue;
        if (childNode.localName) {
            if (childNode.localName.toLowerCase() != "param") {
                throw new Error('Bad payload, expected param');
            }
        } else {
            //IE does not know DOM2
            if (childNode.nodeName.toLowerCase() != "param") {
                throw new Error('Bad payload, expected param (IE)');
            }
        }        
        var data = childNode.getAttribute('name');
        if (data != null) { 
            // Decide if we have a string or a dom parameter
            var childCount = childNode.childNodes.length;
            var result;
            if (childCount == 0) {
                result = '';
            } else {
                // (we do not interpret html inline content any more)
                // we have a single text node
                // OR
                // we have a single CDATA node (HTML parameter CDATA-style)
                    var isTextNode = childNode.firstChild.nodeType == 3;
                    var isCData = childNode.firstChild.nodeType == 4;
                    if (! (childCount == 1 && (isTextNode || isCData))) {
                        kukit.E = 'Bad payload, expected a text or a CDATA node';
                        throw new Error(kukit.E); 
                    }
                // we consider this as html payload
                // The result is always a string from here.
                result = childNode.firstChild.nodeValue;
            }
            params[data] = result;
        } else {
            throw new Error('Bad payload, expected attribute "name"');
        }
    }
    var command = new kukit.cr.makeCommand(selector, name, type, params,
        transport);
    this.addCommand(command);
}; 

this.addCommand = function(command) {
    this.commands[this.commands.length] = command;
};

this.executeCommands = function(oper) {
    // node, eventRule, binder are given on oper, in case
    // the command was called up from an event
    if (typeof(oper) == 'undefined' || oper == null) {
        oper = new kukit.op.Oper();
    }
    var commands = this.commands;
    for (var y=0;y < commands.length;y++) {
        var command = commands[y];
        try {
            command.execute(oper); 
        } catch (e) {
            if (e.name == 'RuleMergeError' || e.name == 'EventBindError') {
                throw(e);
            } else {
                // augment the error message
                throw kukit.err.commandExecutionError(e, command); 
            }
        }
    }
};
this.initialize.apply(this, arguments);
};

}();                              /// MODULE END


/*
* Copyright (c) 2005-2008
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

kukit.sr = new function() {   /// MODULE START

var sr = this;

// Registry of the pprovider functions for selecting

sr.pproviderSelRegistry = new kukit.pr.ValueProviderRegistry();

/*
* class _AnyPP
*
* This will provide an arbitrary selector, and is designed to
* be used with the makeAnyPP factory function.
*
*/
var _AnyPP = function() {

this.check = function(args) {
    // check does not need to be used here actually.
//;;; if (args.length != 1) {
//;;;     throw new Error('internal error, xxxselector() needs 1 argument');
//;;; }
};
this.eval = function(args, node, defaultParameters) {
    var f = kukit.selectorTypesGlobalRegistry.get(this.selector_type);
    // We don't have orignode if we evaluate from here, consequently
    // the orignode parameter cannot be used from selectors. We pass
    // node just to be sure...
    return f(args[0], node, defaultParameters, node);
};

};

sr.pproviderSelRegistry.register('', _AnyPP);

sr.makeAnyPP = function(selector_type) {
    var pp = function () {};
    pp.prototype = new _AnyPP();
    pp.prototype.selector_type = selector_type;
    return pp;
};

/*
* class _AnyPP
*
* This can be used to pass a node programmatically
*
*/
var _PassnodePP = function() {

this.check =  function(args) {
    if (args.length != 1) {
        throw new Error('passnode selector method needs 1 argument');
    }
};
this.eval = function(args, node, defaultParameters) {
    var value = defaultParameters[args[0]];
    if (typeof(value) == 'undefined') {
        // notfound arguments will get null
        kukit.E = 'Nonexistent default parm "'+ key +'"';
        throw new Error(kukit.E);
    }
    nodes = [value];
    return nodes;
};

};
sr.pproviderSelRegistry.register('passnode', _PassnodePP, 'selection');


/* 
* class SelectorTypeRegistry 
*
*  available for plugin registration
*
*  usage:
*
*  kukit.selectorTypesGlobalRegistry.register(name, func);
*
*/
var _SelectorTypeRegistry = function () {

this.initialize = function() {
    this.mapping = {};
};

this.register = function(name, func) {
    if (typeof(func) == 'undefined') {
        throw new Error('Func is mandatory.');
    }
    if (this.mapping[name]) {
       // Do not allow redefinition
       kukit.logError('Error : redefinition attempt of selector ' + name);
       return;
    }
    this.mapping[name] = func;
    // Also register the selector param provider
    var pp = sr.makeAnyPP(name);
    // register them with returnType = 'nodes'
    kukit.pprovidersGlobalRegistry.register(name, pp, 'selection');
};

this.get = function(name) {
    if (! name) {
        // if name is null or undefined or '',
        // we use the default type.
        name = this.defaultSelectorType;
    }
    var result = this.mapping[name];
    if (typeof(result) == 'undefined') {
       throw new Error('Unknown selector type "' + name + '"');
    }
    return result;
};
this.initialize.apply(this, arguments);
};

_SelectorTypeRegistry.prototype.defaultSelectorType = 'css';


kukit.selectorTypesGlobalRegistry = new _SelectorTypeRegistry();

kukit.selectorTypesGlobalRegistry.register('htmlid', function(expr, node) {
    var nodes = [];
    var node = document.getElementById(expr);
    if (node) {
        nodes.push(node);
        }
    return nodes;
});

kukit.selectorTypesGlobalRegistry.register('css', function(expr, node) {
    // Always search globally
    var nodes = kukit.dom.cssQuery(expr);
    return nodes;
});

kukit.selectorTypesGlobalRegistry.register('samenode', function(expr, node) {
    nodes = [node];
    return nodes;
});

// Return a list of all nodes that match the css expression in the parent chain
kukit.selectorTypesGlobalRegistry.register('parentnode', function(expr, node) {
    var selectednodes = kukit.dom.cssQuery(expr);
    var parentnodes = [];
    var parentnode = node.parentNode;
    while(parentnode.parentNode) {
        parentnodes.push(parentnode);
        parentnode = parentnode.parentNode;
    }

    // Filter the nodes so that only the ones in the parent chain remain
    var results = [];
    for(var i=0; i<selectednodes.length; i++){
        var inchain = false;
        for(var j=0; j<parentnodes.length; j++){
            if(selectednodes[i] === parentnodes[j]){
                inchain = true;
            }
        }
        if(inchain){
            results.push(selectednodes[i]);
        }
    }
    return results;
});


}();                              /// MODULE END


/*
* Copyright (c) 2005-2008
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

/* Form handling utilities */

kukit.fo = new function() {   /// MODULE START

var fo = this;

/* form query assembler */

// Prefix constants for dict marshalling, 
//     pattern: %s(_dictPrefix)%(name)s%(_dictSeparator)s%(key)s%(_dictPostfix)s
// XXX this should be settable
var _dictPrefix = '';
var _dictSeparator = '.';
var _dictPostfix = ':record';

/*
* class _FormQueryElem
*/
var _FormQueryElem = function() {

this.initialize = function(name, value) {
    this.name = name;
    this.value = value;
};
    
this.encode = function() {
    return this.name+ "=" + encodeURIComponent(this.value);
};
this.initialize.apply(this, arguments);
};
    
/*
* class FormQuery
*/
fo.FormQuery = function() {

this.initialize = function() {
    this.l = [];
};

this.appendElem = function(name, value) {
    if (value == null) {
        // do not marshall nulls
        var msg = "Parameter '" + name + "' is null,";
        msg += " it is not marshalled.";
        kukit.logDebug(msg);
        }
    else if (typeof(value) == 'string') {
        var elem = new _FormQueryElem(name, value);
        this.l.push(elem);
    }
    // value.length is for detection of an Array.
    // In addition we also check that value.pop is a function
    else if (typeof(value) == 'object' && 
        typeof(value.length) == 'number' &&
        typeof(value.pop) == 'function') {
        // Special marshalling of arrays
        for (var i=0; i < value.length; i++) {
            var elem = new _FormQueryElem(name, value[i]);
            this.l.push(elem);
        }
    }
    else if (typeof(value) == 'object') {
        // Special marshalling of dicts
        for (var key in value) {
            var qkey = _dictPrefix + name + _dictSeparator;
            qkey += key + _dictPostfix;
            var elem = new _FormQueryElem(qkey, value[key]);
            this.l.push(elem);
        }
    }    
};

this.encode = function() {
    var poster = [];
      for (var i=0;i < this.l.length;i++) {
        poster[poster.length] = this.l[i].encode();
    }
    return poster.join("&");
};

this.toDict = function() {
    var d = {};
      for (var i=0;i < this.l.length;i++) {
        var elem = this.l[i];
        d[elem.name] = elem.value;
    }
    return d;
};
this.initialize.apply(this, arguments);
};

/* Form data extraction, helpers */

var findContainer = function(node, func) {
    // Starting with the given node, find the nearest containing element
    // for which the given function returns true.
    while (node != null) {
        if (func(node)) {
            return node;
        }
        node = node.parentNode;
    }
    return null;
};

/*
 * class CurrentFormLocator: gets the current form of a target
 *
 */

fo.CurrentFormLocator = function() {

this.initialize = function(target) {
    this.target = target;
};

this.queryForm = function() {
    // Find the form that contains the target node.
    return findContainer(this.target, function(node) {
        if (!node.nodeName) {
            return false;
        }
        if (node.nodeName.toLowerCase() == "form") {
            return true;
        } else {
            return false;
        }
    });
};

this.getForm = function() {
    var form = this.queryForm();
    if (!form) {
        kukit.logWarning("No form found");
        return null;
    }
    return form;
};
this.initialize.apply(this, arguments);
};

/*
 * class NamedFormLocator: gets the form with a given name
 *
 */

fo.NamedFormLocator = function() {

this.initialize = function(formname) {
    this.formname = formname;
};

this.queryForm = function() {
    // Find the form with the given name.
    return document.forms[this.formname];
};

this.initialize.apply(this, arguments);
};
fo.NamedFormLocator.prototype = new fo.CurrentFormLocator();

/* methods to take the desired value(s) from the form */

fo.getValueOfFormElement = function(element) {
    // Returns the value of the form element / or null
    // First: update the field in case an editor is lurking
    // in the background
    this.fieldUpdateRegistry.doUpdate(element);
    if (element.disabled) {
        return null;
    }
    // Collect the data
    if (element.selectedIndex != undefined) {
        // handle single selects first
        if(!element.multiple) {
                if (element.selectedIndex < 0) {
                    value="";
                } else {
                    var option = element.options[element.selectedIndex];
                    // on FF and safari, option.value has the value
                    // on IE, option.text needs to be used
                    value = option.value || option.text;
                } 
        // Now process selects with the multiple option set
        } else {
            var value = [];
            for(i=0; i<element.options.length; i++) {
                var option = element.options[i];
                if(option.selected) {
                    // on FF and safari, option.value has the value
                    // on IE, option.text needs to be used
                    value.push(option.value || option.text);
                }
            }
        }
    // Safari 3.0.3 no longer has "item", instead it works
    // with direct array access []. Although other browsers
    // seem to support this as well, we provide checking
    // in both ways. (No idea if item is still needed.)
    } else if (typeof element.length != 'undefined' && 
        ((typeof element[0] != 'undefined' && 
        element[0].type == "radio") ||
        (typeof element.item(0) != 'undefined' &&
        element.item(0).type == "radio"))) {
        // element really contains a list of input nodes,
        // in this case.
        var radioList = element;
        value = null;
        for (var i=0; i < radioList.length; i++) {
            var radio = radioList[i] || radioList.item(i);
            if (radio.checked) {
                value = radio.value;
            }
        }
    } else if (element.type == "radio" || element.type == "checkbox") {
        if (element.checked) {
           value = element.value;
        } else {
            value = null;
        }   
    } else if ((element.tagName.toLowerCase() == 'textarea')
               || (element.tagName.toLowerCase() == 'input' && 
                    element.type != 'submit' && element.type != 'reset')
              ) {
        value = element.value;
    } else {
        value = null;
    }
    return value;
};

fo.getFormVar = function(locator, name) {
    var form = locator.getForm();
    if (! form)
        return null;
    // Extract the value of a formvar
    var value = null;
    var element = form[name];
    // (in case of a radio button this will give a collection
    // that contains the list of input nodes.)
    if (element) {
        var value = fo.getValueOfFormElement(element);
        if (value != null) {
            var msg = "Form element [" + element.tagName + "] : name = ";
            msg += element.name + ", value = " + value + '.';
            kukit.logDebug(msg);
        }
    } else {
        kukit.logWarning('Form element [' + name + '] not found in form.');
    }
    return value;
};

fo.getAllFormVars = function(locator, collector) {
    var form = locator.getForm();
    if (! form)
        return collector.result;
    // extracts all elements of a given form
    // the collect_hook will be called wih the name, value parameters to add it
    var elements = form.elements;
    for (var y=0; y<elements.length; y++) {
        var element = elements[y];
        var value = fo.getValueOfFormElement(element);
        if (value != null) {
            var msg = "Form element [" + element.tagName + "] : name = ";
            msg += element.name + ", value = " + value + '.';
            kukit.logDebug(msg);
            collector.add(element.name, value);
        }
    }
    return collector.result;
};


/* With editors, there are two main points of handling:

   1. we need to load them after injected dynamically
   2. we need to update the form before we accces the form variables

    Any editor has to register the field on their custody.
    The update handler will be called automatically, when a form
    value is about to be fetched.
*/

/*
* class _FieldUpdateRegistry
*/
var _FieldUpdateRegistry = function() {

this.initialize = function() {
    this.editors = {};
};

this.register = function(node, editor) {
    var hash = kukit.rd.hashNode(node);
    if (typeof(this.editors[hash]) != 'undefined') {
        kukit.E = 'Double registration of editor update on node.';
        throw new Error(kukit.E);
    }
    this.editors[hash] = editor;
    //kukit.logDebug('Registered '+node.name + ' hash=' + hash);
    //Initialize the editor
    editor.doInit();
};

this.doUpdate = function(node) {
    var hash = kukit.rd.hashNode(node);
    var editor = this.editors[hash];
    if (typeof(editor) != 'undefined') {
        editor.doUpdate(node);
        //kukit.logDebug('Updated '+node.name + ' hash=' + hash);
    }
};
this.initialize.apply(this, arguments);
};

// fieldUpdateRegistry is a public service, available to all components
// that want to be notified when kss wants to use a field value.
this.fieldUpdateRegistry = new _FieldUpdateRegistry();


//
// form, currentForm will fetch an entire form for marshalling.
// This is needed because duplications and order must be preserved.
// The returnType of them will be registered as "formquery". This
// represents a list of (key, value) tuples that need to be marshalled.
// This assures to preserve order of keys, which is important
// for multi-values.
//

/*
*
* class _FormValueProvider
*
*/
var _FormValueProvider = function() {

this.check = function(args) {
    if (args.length != 1) {
        throw new Error('form method needs 1 arguments (formname)');
    }
};

this.eval = function(args, node) {
    var locator = new fo.NamedFormLocator(args[0]);
    var collector = new kukit.ut.TupleCollector();
    return fo.getAllFormVars(locator, collector);
};

};

kukit.pprovidersGlobalRegistry.register('form', _FormValueProvider, 'formquery');

/*
*
* class _CurrentFormValueProvider
*
*/
var _CurrentFormValueProvider = function() {

this.check = function(args) {
    if (args.length != 0) {
        throw new Error('currentForm method needs no argument');
    }
};

this.eval = function(args, node) {
    var locator = new fo.CurrentFormLocator(node);
    var collector = new kukit.ut.TupleCollector();
    return fo.getAllFormVars(locator, collector);
};

};

kukit.pprovidersGlobalRegistry.register('currentForm', _CurrentFormValueProvider, 'formquery');


/* BBB. To be deprecated on 2008-06-15 */

fo.getCurrentForm = function(target) {
    var msg = 'Deprecated kukit.fo.getCurrentForm(target), use new ';
    msg += 'kukit.fo.CurrentFormLocator(target).getForm() instead!';
    kukit.logWarning(msg);
    return new fo.CurrentFormLocator(target).getForm();
};

fo.getFormVarFromCurrentForm = function(target, name) {
    var msg = 'Deprecated kukit.fo.getFormVarFromCurrentForm(target, name),';
    msg += ' use kukit.fo.getFormVar(new kukit.fo.CurrentFormLocator(target),';
    msg += ' name) instead!';
    kukit.logWarning(msg);
    return fo.getFormVar(new fo.CurrentFormLocator(target), name);
};

fo.getFormVarFromNamedForm = function(formname, name) {
    var msg = 'Deprecated kukit.fo.getFormVarFromNamedForm(formname, name),';
    msg += ' use kukit.fo.getFormVar(new kukit.fo.NamedFormLocator(formname),';
    msg += ' name) instead!';
    kukit.logWarning(msg);
    return fo.getFormVar(new fo.NamedFormLocator(formname), name);
};

fo.getAllFormVarsFromCurrentForm = function(target) {
    var msg = 'Deprecated kukit.fo.getAllFormVarsFromCurrentForm(target),';
    msg += ' use kukit.fo.getAllFormVars(new kukit.fo.CurrentFormLocator';
    msg += '(target), new kukit.ut.DictCollector()) instead!';
    kukit.logWarning(msg);
    return fo.getAllFormVars(new fo.CurrentFormLocator(target),
        new kukit.ut.DictCollector());
};

fo.getAllFormVarsFromNamedForm = function(formname) {
    var msg = 'Deprecated kukit.fo.getAllFormVarsFromNamedtForm(formname), ';
    msg += 'use kukit.fo.getAllFormVars(new kukit.fo.NamedFormLocator';
    msg += '(formname), new kukit.ut.DictCollector()) instead!';
    kukit.logWarning(msg);
    return fo.getAllFormVars(new fo.NamedFormLocator(formname),
        new kukit.ut.DictCollector());
};

}();                              /// MODULE END

/*
* Copyright (c) 2005-2007
* Authors: KSS Project Contributors (see doc/CREDITS.txt)
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License version 2 as published
* by the Free Software Foundation.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA
* 02111-1307, USA.
*/

/* Core plugins and utilities */

kukit.pl = new function() {   /// MODULE START

var pl = this;

/* 
* Event plugins 
* 
* __trigger_event__(name, parms, node)
* is a method bound to each class, so methods can call
* it up to call an event action bound through kss.
*
* The event binder hooks
* __bind__(name, parms, func_to_bind)
* should be defined to make binding of event to the given function.
*
* The event action hooks
* __exec__(name, parms, node)
* can be defined to specify a default event action.
*/

pl.getTargetForBrowserEvent = function(e) {
    // this prevents the handler to be called on wrong elements, which
    // can happen because of propagation or bubbling
    // XXX this needs to be tested in all browsers
    if (!e) var e=window.event;
    var target = null;
    if (e.target) {
        target = e.target;
    } else if (e.srcElement) {
        target = e.srcElement;
    }
    /* ???
    if (e.currentTarget)
        if (target != e.currentTarget)
            target = null;*/
    return target;
};

/*
* function registerBrowserEvent
*
* This can be used to register native events in a way that
* they handle allowbubbling, preventdefault and preventbubbling as needed.
* (The handling of these parms are optional, it is allowed not to have them
* in the oper.parms.)
*
* The register function can also take a filter function as parameter. 
* This function needs to receive oper as a parameter,
* where 'browserevent' will be set on oper too as the native browser event.
* The function must return true if it wants the event to execute,
* false otherwise.
* If it returns false, the event will not be prevented and counts as if
* were not called.
* This allows for certain event binder like key handlers, to put an extra
* condition on the triggering of event.
*
* The eventName parameter is entirely optional and
* can be used to set up a different
* event from the desired one.
*/

pl.registerBrowserEvent = function(oper, filter, eventName) {
    var func_to_bind = oper.makeExecuteActionsHook(filter);
    if (! eventName)
        eventName = oper.getEventName();
    var func = function(e) {
        var target = pl.getTargetForBrowserEvent(e);
        if (oper.parms.allowbubbling || target == oper.node) {
            // Execute the action, provide browserevent on oper
            // ... however, do it protected. We want the preventdefault
            // in any case!
            var exc;
            var success;
            try {
                success = func_to_bind({'browserevent': e});
            } catch(exc1) {
                exc = exc1;    
            }
            if (success || exc) {
                // This should only be skipped, if the filter told
                // us that we don't need this event to be executed.
                // If an exception happened during the event execution,
                // we do yet want to proceed with the prevents.
                //
                // Cancel default event ?
                if (oper.parms.preventdefault) {
                    // W3C style
                    if (e.preventDefault)
                        e.preventDefault();
                    // MS style
                    try { e.returnValue = false; } catch (exc2) {}
                }
                // Prevent bubbling to other kss events ?
                if (oper.parms.preventbubbling) {
                    if (!e) var e = window.event;
                    e.cancelBubble = true;
                    if (e.stopPropagation) e.stopPropagation();
                }
            }
            //
            if (exc != null) {
                // throw the original exception
                throw exc;
            }
        } else {
            var msg = 'Ignored bubbling event for event [' + eventName;
            msg += '], target [' + target.tagName + '], EventRule #';
            msg += oper.eventRule.getIndex() + ' mergeId [';
            msg += oper.eventRule.kssSelector.mergeId + '].'; 
            kukit.log(msg);
        }
    };

    // register the event listener
    kukit.ut.registerEventListener(oper.node, eventName, func);
     
    //
    // XXX Safari hack
    // necessary since Safari does not prevent the <a href...> following
    // (in case of allowbubbling we have to apply it to all clicks, as there
    // might be a link inside that we cannot detect on the current node)
    //
    if (oper.parms.preventdefault && kukit.HAVE_SAFARI 
            && (oper.parms.allowbubbling || eventName == 'click'
            && oper.node.tagName.toLowerCase() == 'a')) {
        oper.node.onclick = function cancelClickSafari() {
            return false;
        };
    }
};

/*
* class NativeEventBinder
*/
pl.NativeEventBinder = function() {

this.__bind__node = function(name, func_to_bind, oper) {
    if (oper.node == null) {
        throw new Error('Native event [' + name + '] must be bound to a node.');
    }
    this.__bind__(name, func_to_bind, oper);
};

this.__bind__nodeorwindow = function(name, func_to_bind, oper) {
    if (oper.node == null) {
        oper.node = window;
    }
    this.__bind__(name, func_to_bind, oper);
};

this.__bind__window = function(name, func_to_bind, oper) {
    if (oper.node != null) {
        throw new Error('Native event [' + name + '] must not be bound to a node.');
    }
    oper.node = window;
    this.__bind__(name, func_to_bind, oper);
};

this.__bind__nodeordocument = function(name, func_to_bind, oper) {
    if (oper.node == null) {
        oper.node = document;
    }
    this.__bind__(name, func_to_bind, oper);
};

this.__bind__ = function(name, func_to_bind, oper) {
    oper.componentName = 'native event binding';
    oper.evaluateParameters([], 
        {'preventdefault': '', 'allowbubbling': '', 'preventbubbling': ''});
    oper.evalBool('preventdefault');
    oper.evalBool('allowbubbling');
    oper.evalBool('preventbubbling');
    if (oper.parms.preventdefault) {
        if (name != 'click') {
            kukit.E = 'In native events only the click event can have';
            kukit.E += ' [preventdefault] parameter.';
            throw new Error(kukit.E);
        }
    }
    // we give the name parameter to the registration, so we
    // really bind to the event name we want.
    pl.registerBrowserEvent(oper, null, name);
};

this.__bind_key__ =
    function(name, func_to_bind, oper) {
    oper.componentName = 'native key event binding';
    oper.evaluateParameters([],
        {'preventdefault': 'true', 'allowbubbling': '',
         'preventbubbling': '', 'keycodes': ''});
    oper.evalList('keycodes');
    oper.evalBool('preventdefault');
    oper.evalBool('allowbubbling');
    oper.evalBool('preventbubbling');
    var selected_keycodes_only = false;
    if (oper.parms.keycodes.length > 0) {
        // Convert keyCode to dict
        var keycodes = {};
        for (var i=0; i<oper.parms.keycodes.length; i++) {
            var keyCode = oper.parms.keycodes[i];
            keycodes[keyCode] = true;
        }
        // Set filter so that only the specified keys should trigger.
        selected_keycodes_only = true;
    }
    // We set a filter to execute in any case. This will be used to 
    // set the keycode on the defaultParameters, and also to select 
    // if we want the actions to execute or not.
    var filter = function(oper) {
        // XXX this is still a bit wrong... shift, control, altgr keys
        // may work inconsistently through events and browsers.
        // We attempt to fix this for the alphabet at least
        // (a..z, A..Z)
        var keyCode = oper.browserevent.keyCode;
        //kukit.log('keyCode: ' + keyCode);
        if (keyCode == 0) {
            // need to check also charCode. In case of non-control
            // characters on IE this will have the value.
            keyCode = oper.browserevent.charCode;
            //kukit.log('charCode: ' + keyCode);
        } else {
            // Because of IE madness, we need to consider the shift
            // state in order to have a consistent result.
            if (keyCode >= 65 && keyCode <= 90 && 
                    oper.browserevent.shiftKey == false) { // 'A' <= key <= 'Z'
                // make it a small cap!
                keyCode = keyCode + 32;
                //kukit.log('keyCode compensated: ' + keyCode);
            }
        }
        // Stringify the keycode.
        if (keyCode) {
            keyCode = keyCode.toString();
        } else {
            kukit.logWarning(keyCode);
            keyCode = '0';
        }
        kukit.log(keyCode);
        // Store the keycode on parms, so actions can access it
        // with the value provider pass(keycode).
        oper.defaultParameters = {keycode: keyCode};
        // Return filter result.
        if (selected_keycodes_only) {
            if (keyCode == '0') {
                // Key pressed without an ascii value, like shift or altgr
                // We ignore this.
                return false;
            } else {
                return keycodes[keyCode];
            }
        } else {
            // no filtering: execute the actions in case of any key.
            return true;
        }
    };
    pl.registerBrowserEvent(oper, filter);
};
};


/*
* class TimeoutEventBinder
*
*  Timer events. The binding of this event will start one counter
*  per event rule. No matter how many nodes matched it. 
*  The timer will tick for ever,
*  unless the binding node has been deleted, in which case it stops,
*  or it runs only once if repeat=false is given.
*/
pl.TimeoutEventBinder = function() {

this.initialize = function() {
    this.counters = {};
};

this.__bind__ = function(name, func_to_bind, oper) {
    oper.componentName = 'timeout event binding';
    oper.evaluateParameters(['delay'], {'repeat': 'true'});
    oper.evalBool('repeat');
    var key = oper.eventRule.getIndex();
    if (! (oper.parms.repeat && this.counters[key])) {
        var msg = 'Timer event key entered for actionEvent #' + key;
        msg += ', selector [' + oper.eventRule.kssSelector.css + '].';
        kukit.logDebug(msg);
        var f = function() {
            // check if the node has been deleted
            // and weed it out if so
            if (oper.node != null && ! oper.node.parentNode) {
            var msg = 'Timer event key deleted for actionEvent #' + key;
            msg += ', selector [' + oper.eventRule.kssSelector.css + '].';
            kukit.logDebug(msg);
                this.clear();
            } else {
                func_to_bind();
            }
        };
        var delay = oper.parms.delay;
        var repeat = oper.parms.repeat;
        var counter = new kukit.ut.TimerCounter(delay, f, repeat); 
        this.counters[key] = counter;
        // Start the counter
        counter.start();
    } else {   
        // Don't bind the counter if we matched this eventRule already
        // (this is only checked if this event is repeating)
        var msg = 'Timer event key ignored for actionEvent #' + key;
        msg += ', selector [' + oper.eventRule.kssSelector.css + '].';
        kukit.logDebug(msg);
    }
};
this.initialize.apply(this, arguments);
};

/*
* class LoadEventBinder
*/
pl.LoadEventBinder = function() {

this.processParameters =
    function(oper, iload) {
    if (! oper) {
        return;
    }
    if (iload) {
        oper.componentName = '[iload] event binding';
        oper.evaluateParameters(['autodetect'],
            {'initial': 'true', 'insert': 'true'});
        // autodetect=false changes the iload autosense method to one
        // that requires that code in the iframe set the _kssReadyForLoadEvent
        // attribute on the document. Setting this attribute is explicitely 
        // required if autodetect is off, since we would never notice
        // if the document has arrived in this case.
        oper.evalBool('autodetect');
    } else {
        oper.componentName = '[load] event binding';
        oper.evaluateParameters([], {'initial': 'true', 'insert': 'true'});
    }
    oper.evalBool('initial');
    oper.evalBool('insert');
    var phase;
    if (oper.node == null) {
        // if the event is bound to a document node,
        // we are in phase 1.
        phase = 1;
    } else {
        // get the phase from the node
        phase = oper.node._kukitMark;
    }
    if (phase == 1 && ! oper.parms.initial) {
        var msg = 'EventRule #' + oper.eventRule.getIndex() + ' mergeId [';
        msg += oper.eventRule.kssSelector.mergeId + '] event ignored,';
        msg += ' oninitial=false.';
        kukit.logDebug(msg);
        return;
    }
    if (phase == 2 && ! oper.parms.insert) {
        var msg = 'EventRule #' + oper.eventRule.getIndex() + ' mergeId [';
        msg += oper.eventRule.kssSelector.mergeId + '] event ignored,';
        msg += ' oninsert=false.';
        kukit.logDebug(msg);
        return;
    }
    return oper;
};

this.__bind__ = function(opers_by_eventName) {
    // This bind method handles load and iload events together, and 
    // opers_by_eventName is
    // a dictionary of opers which can contain a load and an iload key,
    // either one or both.
    var loadoper = opers_by_eventName.load;
    var iloadoper = opers_by_eventName.iload;
    loadoper = this.processParameters(loadoper);
    iloadoper = this.processParameters(iloadoper, true);
    var anyoper = loadoper || iloadoper;
    if (! anyoper) {
        return;
    }
    if (anyoper.node != null && 
        anyoper.node.tagName.toLowerCase() == 'iframe') {
        // In an iframe.
        //
        // BBB If there is only a load (and no iload) event bound to this node, 
        // we interpret it as an iload event, but issue deprecation warning.
        // This conserves legacy behaviour when the load event was actually
        // doing an iload, when it was bound to an iframe node.
        // The deprecation tells that the event should be changed 
        // from load to iload.
        if (loadoper && ! iloadoper) {
            iloadoper = loadoper;
            loadoper = null;
            // with the legacy loads we suppose autodetect=false
            iloadoper.parms.autodetect = false;
            var msg = 'Deprecated the use of [load] event for iframes. It';
            msg += ' will behave differently in the future. Use the';
            msg += ' [iload] event (maybe with [evt-iload-autodetect:';
            msg += ' false]) instead !';
            kukit.logWarning(msg);
        } 
    } else {
        // Not an iframe. So iload is not usable.
        if (iloadoper) {
            kukit.E = '[iload] event can only be bound to an iframe node.';
            throw new Error(kukit.E);
        }
    }
    // Now, bind the events.
    if (loadoper) {
        var msg = 'EventRule #' + loadoper.eventRule.getIndex() + ' mergeId [';
        msg += loadoper.eventRule.kssSelector.mergeId;
        msg += '] selected normal postponed execution.';
        kukit.logDebug(msg);
        // for any other node than iframe, or even for iframe in phase1,
        // we need to execute immediately.
        var func_to_bind = loadoper.makeExecuteActionsHook();
        var remark = '';
        remark += '[load] event execution for ';
        // loadoper can execute on document!
        // Is this the case? 
        if (loadoper.node == null) {
            // document:load
            remark += '[document]';
        } else {
            // <node>:load
            remark += 'node [';
            remark += loadoper.node.tagName.toLowerCase();
            remark += ']';
        }
        kukit.engine.bindScheduler.addPost(func_to_bind, remark);
    }
    if (iloadoper) {
        var phase = iloadoper.node._kukitMark;
        // For phase 2 we need to execute posponed, for phase1 immediately.
        // XXX it would be better not need this and do always postponed.
        if (phase == 2 || (phase == 1 && kukit.engine.initializedOnDOMLoad)) {
            var msg = 'EventRule #' + iloadoper.eventRule.getIndex();
            msg += ' mergeId [' + iloadoper.eventRule.kssSelector.mergeId;
            msg += ' event selected delayed execution (when iframe loaded)';
            kukit.logDebug(msg);
            // We want the event execute once the iframe is loaded.
            // In a somewhat tricky way, we start the scheduler only from
            // the normal delayed execution. This will enable that in
            // case we had a load event on the same node, it could modify
            // the name and id parms and we only start
            // the autosense loop (which is based on name and id) after the
            // load event's action executed. 
            // (Note, oper.node.id may lie in the log then and show the 
            // original, unchanged id but we ignore this for the time.)
            var g = function() {
                var f = function() {
                    var func_to_bind = iloadoper.makeExecuteActionsHook();
                    var remark = '';
                    remark += '[iload] event execution for iframe [';
                    remark += iloadoper.node.name + ']';
                    kukit.engine.bindScheduler.addPost(func_to_bind, remark);
                };
                new kukit.dom.EmbeddedContentLoadedScheduler(iloadoper.node.id,
                    f, iloadoper.parms.autodetect);
            };
            var remark = '';
            remark += 'Schedule [iload] event for iframe ';
            remark += iloadoper.node.name + ']';
            kukit.engine.bindScheduler.addPost(g, remark);
        } else {
            var msg = 'EventRule #' + iloadoper.eventRule.getIndex();
            msg += ' mergeId [';
            msg += iloadoper.eventRule.kssSelector.mergeId;
            msg += '] event selected normal postponed execution.';
            kukit.logDebug(msg);
            var func_to_bind = iloadoper.makeExecuteActionsHook();
            var remark = '';
            remark += 'Execute [iload] event for iframe ';
            remark += iloadoper.node.name + ']';
            kukit.engine.bindScheduler.addPost(func_to_bind, remark);
        }
    }
};

};

/*
* class SpinnerEventBinder
*
* Spinner support. Besides the event itself we use some utility
* classes to introduce lazyness (delay) for the spinner.
*/
pl.SpinnerEventBinder = function() {

this.initialize = function() {
    this.state = false;
    var self = this;
    var _timeoutSetState = function(spinnerevent) {
       self.timeoutSetState(spinnerevent);
    };
    this.scheduler = new kukit.ut.Scheduler(_timeoutSetState);
};

this.__bind__ = function(name, func_to_bind, oper) {
    oper.componentName = '[spinner] event binding';
    oper.evaluateParameters([], {'laziness': 0});
    oper.evalInt('laziness');
    // Register the function with the global queue manager
    var state_to_bind = (name == 'spinneron');
    var self = this;
    var func = function() {
        self.setState(func_to_bind, state_to_bind, oper.parms.laziness);
    };
    kukit.engine.requestManager.registerSpinnerEvent(func, state_to_bind);
};

this.setState = function(func_to_bind, state, laziness) {
    // This is called when state changes. We introduce laziness
    // before calling the func.
    this.func_to_bind = func_to_bind;
    this.state = state;
    var now = (new Date()).valueOf();
    var wakeUp = now + laziness;
    this.scheduler.setNextWakeAtLeast(wakeUp);
};

this.timeoutSetState = function() {
    // really call the bound actions which should set the spinner
    var func = this.func_to_bind;
    func();
};
this.initialize.apply(this, arguments);
};

}();                              /// MODULE END

/*
* Registration of all the native events that can bound
* to a node or to document 
*  (= document or window, depending on the event specs)
*  Unsupported are those with absolute no hope to work in a cross browser way
*  Preventdefault is only allowed for click and key events, currently
*/
kukit.eventsGlobalRegistry.register(null, 'blur', kukit.pl.NativeEventBinder,
    '__bind__nodeorwindow', null);
kukit.eventsGlobalRegistry.register(null, 'focus', kukit.pl.NativeEventBinder,
    '__bind__nodeorwindow', null);
kukit.eventsGlobalRegistry.register(null, 'resize', kukit.pl.NativeEventBinder,
    '__bind__nodeorwindow', null);
kukit.eventsGlobalRegistry.register(null, 'click', kukit.pl.NativeEventBinder,
    '__bind__nodeordocument', null);
kukit.eventsGlobalRegistry.register(null, 'dblclick',
    kukit.pl.NativeEventBinder, '__bind__node', null);
kukit.eventsGlobalRegistry.register(null, 'mousedown',
    kukit.pl.NativeEventBinder, '__bind__nodeordocument', null);
kukit.eventsGlobalRegistry.register(null, 'mouseup',
    kukit.pl.NativeEventBinder, '__bind__nodeordocument', null);
kukit.eventsGlobalRegistry.register(null, 'mousemove',
    kukit.pl.NativeEventBinder, '__bind__nodeordocument', null);
kukit.eventsGlobalRegistry.register(null, 'mouseover',
    kukit.pl.NativeEventBinder, '__bind__node', null);
kukit.eventsGlobalRegistry.register(null, 'mouseout',
    kukit.pl.NativeEventBinder, '__bind__node', null);
kukit.eventsGlobalRegistry.register(null, 'change',
    kukit.pl.NativeEventBinder, '__bind__node', null);
kukit.eventsGlobalRegistry.register(null, 'reset',
    kukit.pl.NativeEventBinder, '__bind__node', null);
kukit.eventsGlobalRegistry.register(null, 'select',
    kukit.pl.NativeEventBinder, '__bind__node', null);
kukit.eventsGlobalRegistry.register(null, 'submit',
    kukit.pl.NativeEventBinder, '__bind__node', null);
kukit.eventsGlobalRegistry.register(null, 'keydown',
    kukit.pl.NativeEventBinder, '__bind_key__', null);
kukit.eventsGlobalRegistry.register(null, 'keypress',
    kukit.pl.NativeEventBinder, '__bind_key__', null);
kukit.eventsGlobalRegistry.register(null, 'keyup',
    kukit.pl.NativeEventBinder, '__bind_key__', null);
//kukit.eventsGlobalRegistry.register(null, 'unload',
//    kukit.pl.NativeEventBinder, '__bind__window', null);

kukit.eventsGlobalRegistry.register(null, 'timeout',
    kukit.pl.TimeoutEventBinder, '__bind__', null);

// Use the [node] iterator to provide expected invocation
// and call signature of the bind method.
kukit.eventsGlobalRegistry.registerForAllEvents(null, ['load', 'iload'],
    kukit.pl.LoadEventBinder, '__bind__', null, 'Node');


kukit.eventsGlobalRegistry.register(null, 'spinneron',
    kukit.pl.SpinnerEventBinder, '__bind__', null);
kukit.eventsGlobalRegistry.register(null, 'spinneroff',
    kukit.pl.SpinnerEventBinder, '__bind__', null);

/* Core actions
*
* The core client actions that can be executed on the client
* side.
*
* They also get registered as commands
*/
kukit.actionsGlobalRegistry.register('error', function (oper) {
    throw new Error('The builtin error action should never execute.');
    }
);
kukit.commandsGlobalRegistry.registerFromAction('error',
    kukit.cr.makeGlobalCommand);

kukit.actionsGlobalRegistry.register('logDebug', function (oper) {
    var name = '[logDebug] action';
    oper.evaluateParameters([], {'message': '[logDebug] action'}, name);
    var message = oper.parms.message;
    message += oper.debugInformation();    
    kukit.logDebug(message); 
    if (kukit.hasFirebug) {
        kukit.logDebug(oper.node);
    }
});
kukit.commandsGlobalRegistry.registerFromAction('logDebug',
    kukit.cr.makeGlobalCommand);

kukit.actionsGlobalRegistry.register('log', function (oper) {
    oper.evaluateParameters([], {'message': 'Log action'}, 'log action');
    var message = oper.parms.message;
    message += oper.debugInformation();    
    kukit.log(message);
});
kukit.commandsGlobalRegistry.registerFromAction('log',
    kukit.cr.makeGlobalCommand);

kukit.actionsGlobalRegistry.register('alert', function (oper) {
    oper.evaluateParameters([], {'message': 'Alert action'}, 'alert action');
    var message = oper.parms.message;
    message += oper.debugInformation();    
    alert(message);
});
kukit.commandsGlobalRegistry.registerFromAction('alert', 
    kukit.cr.makeGlobalCommand);

/* Core commands 
*
* All the commands are also client actions.
*/

kukit.actionsGlobalRegistry.register('replaceInnerHTML', function(oper) {
/*
*  accepts both string and dom.
*/
    oper.componentName = '[replaceInnerHTML] action';
    oper.evaluateParameters(['html'], {'withKssSetup': true});
    oper.evalBool('withKssSetup');
    var node = oper.node;
    node.innerHTML = oper.parms.html;
    var insertedNodes = [];
    for (var i=0; i<node.childNodes.length; i++) {
        insertedNodes.push(node.childNodes[i]);
    }
    kukit.logDebug(insertedNodes.length + ' nodes inserted.');
    if (oper.parms.withKssSetup) {
        kukit.engine.setupEvents(insertedNodes);
    }
});
kukit.commandsGlobalRegistry.registerFromAction('replaceInnerHTML',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('replaceHTML', function(oper) {
/*
*  accepts both string and dom.
*/
    oper.componentName = '[replaceHTML] action';
    oper.evaluateParameters(['html'], {'withKssSetup':true});
    oper.evalBool('withKssSetup');
    var node = oper.node;
    var elements = kukit.dom.parseHTMLNodes(oper.parms.html);
    var length = elements.length;
    kukit.logDebug(length + ' nodes inserted.');
    if (length > 0) {
        var parentNode = node.parentNode;
        var insertedNodes = [];
        // insert the last node
        var next = elements[length-1];
        parentNode.replaceChild(next, node);
        insertedNodes.push(next);
        // then we go backwards with the rest of the nodes
        for (var i=length-2; i>=0; i--) {
            var inserted = parentNode.insertBefore(elements[i], next);
            insertedNodes.push(inserted);
            next = inserted;
        }
        if (oper.parms.withKssSetup) {
            kukit.engine.setupEvents(insertedNodes);
        }
    }
});
kukit.commandsGlobalRegistry.registerFromAction('replaceHTML',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('setAttribute', function(oper) {
    oper.componentName = '[setAttribute] action';
    oper.evaluateParameters(['name', 'value'], {});
    if (oper.parms.name.toLowerCase() == 'style') {
        kukit.E = '[style] attribute is not allowed with [setAttribute]';
        throw new Error(kukit.E);
    }
    kukit.dom.setAttribute(oper.node, oper.parms.name, 
        oper.parms.value);
});
kukit.commandsGlobalRegistry.registerFromAction('setAttribute',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('setKssAttribute', function(oper) {
    oper.componentName = '[setKssAttribute] action';
    oper.evaluateParameters(['name', 'value'], {});
    kukit.dom.setKssAttribute(oper.node, oper.parms.name, 
        oper.parms.value);
});
kukit.commandsGlobalRegistry.registerFromAction('setKssAttribute',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('setStyle', function(oper) {
    oper.componentName = '[setStyle] action';
    oper.evaluateParameters(['name', 'value'], {});
    oper.node.style[oper.parms.name] = oper.parms.value;
});
kukit.commandsGlobalRegistry.registerFromAction('setStyle', 
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('addClass', function(oper) {
    oper.componentName = '[addClass] action';
    oper.evaluateParameters(['value'], {});
    kukit.dom.addClassName(oper.node, oper.parms.value);
});
kukit.commandsGlobalRegistry.registerFromAction('addClass',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('removeClass', function(oper) {
    oper.componentName = '[removeClass] action';
    oper.evaluateParameters(['value'], {});
    kukit.dom.removeClassName(oper.node, oper.parms.value);
});
kukit.commandsGlobalRegistry.registerFromAction('removeClass',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('insertHTMLAfter', function(oper) {
    oper.componentName = '[insertHTMLAfter] action';
    oper.evaluateParameters(['html'], {'withKssSetup':true});
    oper.evalBool('withKssSetup');
    var content = kukit.dom.parseHTMLNodes(oper.parms.html);
    var parentNode = oper.node.parentNode;
    var toNode = kukit.dom.getNextSiblingTag(oper.node);
    if (toNode == null) {
        kukit.dom.appendChildren(content, parentNode);
    } else {
        kukit.dom.insertBefore(content, parentNode, toNode);
    }
    kukit.logDebug(content.length + ' nodes inserted.');
    // update the events for the new nodes
    if (oper.parms.withKssSetup) {
        kukit.engine.setupEvents(content);
    }
});
kukit.commandsGlobalRegistry.registerFromAction('insertHTMLAfter',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('insertHTMLBefore', function(oper) {
    oper.componentName = '[insertHTMLBefore] action';
    oper.evaluateParameters(['html'], {'withKssSetup':true});
    oper.evalBool('withKssSetup');
    var content = kukit.dom.parseHTMLNodes(oper.parms.html);
    var toNode = oper.node;
    var parentNode = toNode.parentNode;
    kukit.dom.insertBefore(content, parentNode, toNode);
    kukit.logDebug(content.length + ' nodes inserted.');
    // update the events for the new nodes
    if (oper.parms.withKssSetup) {
        kukit.engine.setupEvents(content);
    }
});
kukit.commandsGlobalRegistry.registerFromAction('insertHTMLBefore',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('insertHTMLAsLastChild', function(oper) {
    oper.componentName = '[insertHTMLAsLastChild] action';
    oper.evaluateParameters(['html'], {'withKssSetup':true});
    oper.evalBool('withKssSetup');
    var content = kukit.dom.parseHTMLNodes(oper.parms.html);
    kukit.dom.appendChildren(content, oper.node);
    kukit.logDebug(content.length + ' nodes inserted.');
    // update the events for the new nodes
    if (oper.parms.withKssSetup) {
        kukit.engine.setupEvents(content);
    }
});
kukit.commandsGlobalRegistry.registerFromAction('insertHTMLAsLastChild',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('insertHTMLAsFirstChild', function(oper) {
    oper.componentName = '[insertHTMLAsFirstChild] action';
    oper.evaluateParameters(['html'], {'withKssSetup':true});
    oper.evalBool('withKssSetup');
    var content = kukit.dom.parseHTMLNodes(oper.parms.html);
    var parentNode = oper.node;
    var toNode = parentNode.firstChild;
    if (toNode == null) {
        kukit.dom.appendChildren(content, parentNode);
    } else {
        kukit.dom.insertBefore(content, parentNode, toNode);
    }
    kukit.logDebug(content.length + ' nodes inserted.');
    // update the events for the new nodes
    if (oper.parms.withKssSetup) {
        kukit.engine.setupEvents(content);
    }
});
kukit.commandsGlobalRegistry.registerFromAction('insertHTMLAsFirstChild',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('deleteNodeAfter', function(oper) {
    oper.componentName = '[deleteNodeAfter] action';
    oper.evaluateParameters([], {});
    var parentNode = oper.node.parentNode;
    var toNode = kukit.dom.getNextSiblingTag(oper.node);
    if (toNode != null) {
        parentNode.removeChild(toNode);
    }  
});
kukit.commandsGlobalRegistry.registerFromAction('deleteNodeAfter', 
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('deleteNodeBefore', function(oper) {
    oper.componentName = '[deleteNodeBefore] action';
    oper.evaluateParameters([], {});
    var parentNode = oper.node.parentNode;
    var toNode = kukit.dom.getPreviousSiblingTag(oper.node);
    parentNode.removeChild(toNode);
});
kukit.commandsGlobalRegistry.registerFromAction('deleteNodeBefore', 
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('deleteNode', function(oper) {
    oper.componentName = '[deleteNode] action';
    oper.evaluateParameters([], {});
    var parentNode = oper.node.parentNode;
    parentNode.removeChild(oper.node);
});
kukit.commandsGlobalRegistry.registerFromAction('deleteNode', 
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('clearChildNodes', function(oper) {
    oper.componentName = '[clearChildNodes] action';
    // TODO get rid of none
    oper.evaluateParameters([], {'none': false});
    kukit.dom.clearChildNodes(oper.node);
});
kukit.commandsGlobalRegistry.registerFromAction('clearChildNodes',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('focus', function(oper) {
    oper.componentName = '[focus] action';
    // TODO get rid of none
    oper.evaluateParameters([], {'none': false});
    kukit.dom.focus(oper.node);
});
kukit.commandsGlobalRegistry.registerFromAction('focus',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('blur', function(oper) {
    oper.componentName = '[blur] action';
    // TODO get rid of none
    oper.evaluateParameters([], {'none': false});
    kukit.dom.blur(oper.node);
});
kukit.commandsGlobalRegistry.registerFromAction('blur',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('moveNodeAfter', function(oper) {
    oper.componentName = '[moveNodeAfter] action';
    oper.evaluateParameters(['html_id'], {});
    var node = oper.node;
    var parentNode = node.parentNode;
    parentNode.removeChild(node);
    var toNode = document.getElementById(oper.parms.html_id);
    var nextNode = kukit.dom.getNextSiblingTag(toNode);
    if (nextNode == null) {
        toNode.parentNode.appendChild(node);
    } else {
        parentNode.insertBefore(node, nextNode);
    }
});
kukit.commandsGlobalRegistry.registerFromAction('moveNodeAfter',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('moveNodeBefore', function(oper) {
    oper.componentName = '[moveNodeBefore] action';
    oper.evaluateParameters(['html_id'], {});
    var node = oper.node;
    // no need to remove it, as insertNode does it anyway
    // var parentNode = node.parentNode;
    // parentNode.removeChild(node);
    var toNode = document.getElementById(oper.parms.html_id);
    var parentNode = toNode.parentNode;
    parentNode.insertBefore(node, toNode);
});
kukit.commandsGlobalRegistry.registerFromAction('moveNodeBefore',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('moveNodeAsLastChild', function(oper) {
    oper.componentName = '[moveNodeAsLastChild] action';
    oper.evaluateParameters(['html_id'], {});
    var node = oper.node;
    // no need to remove it, as insertNode does it anyway
    // var parentNode = node.parentNode;
    // parentNode.removeChild(node);
    var parentNode = document.getElementById(oper.parms.html_id);
    parentNode.appendChild(node);
});
kukit.commandsGlobalRegistry.registerFromAction('moveNodeAsLastChild', 
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('copyChildNodesFrom', function(oper) {
    oper.componentName = '[copyChildNodesFrom] action';
    oper.evaluateParameters(['html_id'], {});
    var fromNode = document.getElementById(oper.parms.html_id);
    Sarissa.copyChildNodes(fromNode, oper.node);
});
kukit.commandsGlobalRegistry.registerFromAction('copyChildNodesFrom',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('copyChildNodesTo', function(oper) {
    oper.componentName = '[copyChildNodesTo] action';
    oper.evaluateParameters(['html_id'], {});
    toNode = document.getElementById(oper.parms.html_id);
    Sarissa.copyChildNodes(oper.node, toNode);
});
kukit.commandsGlobalRegistry.registerFromAction('copyChildNodesTo',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('setStateVar', function(oper) {
    oper.componentName = '[setStateVar] action';
    oper.evaluateParameters(['varname', 'value'], {});
    kukit.engine.stateVariables[oper.parms.varname] =
        oper.parms.value;
});
kukit.commandsGlobalRegistry.registerFromAction('setStateVar',
    kukit.cr.makeGlobalCommand);

kukit.actionsGlobalRegistry.register('continueEvent', function(oper) {
    // Trigger continuation event. Event will be triggered on the same node
    // or on all the nodes bound for the current event state.
    // allows excess parms in the following check.
    oper.componentName = '[continueEvent] action';
    oper.evaluateParameters(['name'], {'allnodes': 'false'}, '', true);
    oper.evalBool('allnodes', 'continueEvent');
    var parms = oper.parms;
    var binder = oper.binder;
    var allNodes = parms.allnodes;
    // marshall it, the rest of the parms will be passed
    var actionParameters = {};
    for (var key in parms) {
        if (key != 'name' && key != 'allnodes') {
            actionParameters[key] = parms[key];
        }
    }
    if (parms.allnodes) {
        binder.continueEventAllNodes(parms.name,
            actionParameters);
    } else {
        // execution happens on the orignode
        binder.continueEvent(parms.name, oper.orignode,
            actionParameters);
    }
});
kukit.commandsGlobalRegistry.registerFromAction('continueEvent',
    kukit.cr.makeGlobalCommand);

kukit.actionsGlobalRegistry.register('executeCommand', function(oper) {
    // Allows executing a local action on a different selection.
    //
    // allows excess parms in the following check
    oper.componentName = '[executeCommand] action';
    var msg = 'Deprecated the [executeCommand] action, use [kssSelector] in a standard action!';
    kukit.logWarning(msg);
    oper.evaluateParameters(['name', 'selector'],
                       {'selectorType': null},
                       '', true);
    var parms = oper.parms;
    // marshall it, the rest of the parms will be passed
    var actionParameters = {};
    for (var key in parms) {
        if (key != 'name' && key != 'selector' && key != 'selectorType') {
            actionParameters[key] = parms[key];
        }
    }
    var command = new kukit.cr.makeCommand(parms.selector,
            parms.name, parms.selectorType, actionParameters);
    command.execute(oper);
});


// Add/remove a class to/from a node
kukit.actionsGlobalRegistry.register('toggleClass', function (oper) {
    oper.componentName = '[toggleClass] action';
    // BBB 4 month, until 2007-10-18
    // oper.evaluateParameters(['value'], {});
    kukit.actionsGlobalRegistry.BBB_classParms(oper);

    var node = oper.node;
    var className = oper.parms.value;

    var nodeclass = kukit.dom.getAttribute(node, 'class');
    var classFoundAtIndex = -1;
    var parts = nodeclass.split(' ');
    for(var i=0; i<parts.length; i++){
        if(parts[i]==className){
            classFoundAtIndex = i;
        }
    }
    if(classFoundAtIndex==-1){
        parts.push(className);
    } else {
        parts.splice(classFoundAtIndex, 1);
    }
    kukit.dom.setAttribute(node, 'class', parts.join(' '));
});
kukit.commandsGlobalRegistry.registerFromAction('toggleClass',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register('setActionServerTimeout', function (oper) {
    oper.componentName = '[setActionServerTimeout] action';
    oper.evaluateParameters(['value'], {}, '', true);
    oper.evalInt('value');
    var value = oper.parms.value;
    kukit.engine.requestManager.sendingTimeout = value;
});

/*
*  XXX Compatibility settings for old command names.
*  These will be removed as soon as all current use cases are changed.
*  Do not use these as your code will break!
* 
*/
// BBB remove at 2007-10-18
kukit.commandsGlobalRegistry.registerFromAction('replaceInnerHTML', 
    kukit.cr.makeSelectorCommand, 'setHtmlAsChild');
kukit.commandsGlobalRegistry.registerFromAction('replaceHTML',
    kukit.cr.makeSelectorCommand, 'replaceNode');
kukit.commandsGlobalRegistry.registerFromAction('insertHTMLAfter',
    kukit.cr.makeSelectorCommand, 'addAfter');
kukit.commandsGlobalRegistry.registerFromAction('deleteNodeAfter',
    kukit.cr.makeSelectorCommand, 'removeNextSibling');
kukit.commandsGlobalRegistry.registerFromAction('deleteNodeBefore',
    kukit.cr.makeSelectorCommand, 'removePreviousSibling');
kukit.commandsGlobalRegistry.registerFromAction('deleteNode',
    kukit.cr.makeSelectorCommand, 'removeNode');
kukit.commandsGlobalRegistry.registerFromAction('clearChildNodes',
    kukit.cr.makeSelectorCommand, 'clearChildren');
kukit.commandsGlobalRegistry.registerFromAction('copyChildNodesFrom',
    kukit.cr.makeSelectorCommand, 'copyChildrenFrom');
kukit.commandsGlobalRegistry.registerFromAction('copyChildNodesTo',
    kukit.cr.makeSelectorCommand, 'copyChildrenTo');
kukit.commandsGlobalRegistry.registerFromAction('setStateVar',
    kukit.cr.makeGlobalCommand, 'setStatevar');
// BBB 4 month, until 2007-10-18
kukit.actionsGlobalRegistry.register('addClassName', function(oper) {
    var msg = 'Deprecated the [addClassName]  action, use [addClass] instead!';
    kukit.logWarning(msg);
    oper.componentName = '[addClassName] action';
    kukit.actionsGlobalRegistry.BBB_classParms(oper);
    kukit.actionsGlobalRegistry.get('addClass')(oper);
});
kukit.commandsGlobalRegistry.registerFromAction('addClassName',
    kukit.cr.makeSelectorCommand);
// BBB 4 month, until 2007-10-18
kukit.actionsGlobalRegistry.register('removeClassName', function(oper) {
    var msg = 'Deprecated the [removeClassName]  action, use [removeClass]';
    msg += 'instead !';
    kukit.logWarning(msg);
    oper.componentName = 'removeClassName action';
    kukit.actionsGlobalRegistry.BBB_classParms(oper);
    kukit.actionsGlobalRegistry.get('removeClass')(oper);
});
kukit.commandsGlobalRegistry.registerFromAction('removeClassName',
    kukit.cr.makeSelectorCommand);

// BBB 4 month, until 2007-10-18
kukit.actionsGlobalRegistry.BBB_classParms = function(oper) {
    var old;
    var has_old;
    if (typeof(oper.parms.className) != 'undefined') {
        old = oper.parms.className;
        has_old = true;
    var msg = 'Deprecated the [className] parameter in ' + oper.componentName;
    msg += ', use [value] instead !';
    kukit.logWarning(msg); 
    }
    if (typeof(oper.parms.name) != 'undefined') {
        old = oper.parms.name;
        has_old = true;
        var msg = 'Deprecated the [name] parameter in ' + oper.componentName;
        msg += ', use [value] instead !';
        kukit.logWarning(msg);
    }
    if (has_old) {
        if (typeof(oper.parms.value) == 'undefined') {
            oper.parms = {value: old};
        } else {
            oper.parms = {};
        }
    }
};
// end BBB



/* Use onDOMLoad event to initialize kukit
   earlier then the document is fully loaded,
   but after the DOM is at its place already.
*/

kukit.plone = {};

/* This check must not result in a javascript error, even if jq is
 * not present. Such an error would case all subsequent kss plugin
 * (this file and any other plugins that are loaded later)
 * fail to load.
 *
 * For this reason, it must be guarded by a condition.
 */
if (window.jq) {
    jq(function() {
        kukit.log('KSS started by jQuery DOMLoad event.');
        kukit.bootstrapFromDOMLoad();
    });
}



/* Base kukit plugins for Plone*/

kukit.actionsGlobalRegistry.register("plone-initKupu", function(oper) {
    kukit.logDebug('Enter plone-initKupu');
    oper.evaluateParameters([], {}, 'plone-initKupu action');
    // we start from the iframe node...
    if (oper.node.tagName.toLowerCase() != 'iframe') {
        kukit.E = 'The plone-initKupu action can only be setup on an iframe';
        kukit.E += ' node.';
        throw kukit.E;
    }
    var divnode = oper.node.parentNode.parentNode.parentNode.parentNode;
    var id = divnode.id;
    if (! id) {
        kukit.E = 'The plone-initKupu action did not find the editor id from';
        kukit.E += ' the iframe node.';
        throw kukit.E;
    }
 
    //
    // Register the kupu editor in KSS
    // This enables KSS to update the textarea explicitely. 
    //
    var prefix = '#'+id+' ';
    var textarea = getFromSelector(prefix+'textarea.kupu-editor-textarea');
    kukit.fo.fieldUpdateRegistry.register(textarea,
            {editor: null,
             node: textarea,
             doInit: function() {
                kukit.log('Setup Kupu initialization on load event.');
                var self = this;
                initKupuOnLoad = function() {
                    kukit.log('Initialize Kupu from onload event.');
                    self.editor = initPloneKupu(id);
                };
                this.editor = initPloneKupu(id);
                jq(window).load(initKupuOnLoad);
                },
             doUpdate: function() {
                this.editor.saveDataToField(this.node.form, this.node);
                // set back _initialized
                // XXX check if this is actually ok?
                this.editor._initialized = true;
                }
             });
    kukit.logDebug('plone-initKupu action done.');
});
kukit.commandsGlobalRegistry.registerFromAction('plone-initKupu', 
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register("plone-followLink", function(oper) {
    oper.evaluateParameters([], {}, 'plone-followLink action');
    var url = oper.node.href;
    if (url.substr(0, 7) == "http://") {
        // redirect to it
        window.location.replace(url);
    } else if (url.substr(0, 13) == "javascript://") {
        // execute it
        eval(url.substr(13));
    }
});
kukit.commandsGlobalRegistry.registerFromAction('plone-followLink',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register("plone-submitCurrentForm", function (oper) {
    oper.evaluateParameters([], {}, 'plone-submitCurrentForm action');
    // disable the onbeforeunload event since we want to submit now.
    window.onbeforeunload = null;
    var form = new kukit.fo.CurrentFormLocator(oper.node).getForm();
    form.submit();
});
kukit.commandsGlobalRegistry.registerFromAction('plone-submitCurrentForm',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register("plone-initFormTabs", function(oper) {
    oper.evaluateParameters([], {}, 'plone-initFormTabs action');
    if (oper.node.tagName.toLowerCase() != 'form') {
        kukit.E = 'The plone-initFormTabs action can only execute on a form';
        kukit.E += ' node as a target.';
        throw kukit.E;
    }
    var form = oper.node;  
    ploneFormTabbing.initializeForm(form);
});
kukit.commandsGlobalRegistry.registerFromAction('plone-initFormTabs', kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register("plone-initFormProtection", function(oper) {
    oper.evaluateParameters([], {}, 'plone-initFormProtection action');
    if (oper.node.tagName.toLowerCase() != 'form') {
        kukit.E = 'The plone-initFormProtection action can only execute on';
        kukit.E += ' a form node as a target.';
        throw kukit.E;
    }
    var form = oper.node;  
    if (! window.onbeforeunload) {
        window.onbeforeunload = new BeforeUnloadHandler().execute;
    }
    var tool = window.onbeforeunload.tool;
    // We add the new tool to the 
    tool.addForm(form);
});
kukit.commandsGlobalRegistry.registerFromAction('plone-initFormProtection',
    kukit.cr.makeSelectorCommand);

kukit.actionsGlobalRegistry.register("plone-formProtectionCheck", 
    function(oper) {
    oper.evaluateParameters([], {}, 'plone-formProtectionCheck action');
    // Find the binderInstance of the switcher.
    // (since we are in an action and not in the event,
    // we don't have it at hand.
    // Note that we would not necessarily need the singleton)
    var binderInfo =
        kukit.engine.binderInfoRegistry.getSingletonBinderInfoByName('plone',
        'formProtectionChecked');
    var binderInstance = binderInfo.getBinderInstance();
    // check if the form has change
    var message;
    if ( window.onbeforeunload) {
        var tool = window.onbeforeunload.tool;
        message = tool.execute();
    }
    // Do we need the popup?
    var result = true;
    if (message) {
        var confirmMsg = 'Are you sure you want to navigate away from this';
        confirmMsg += ' page?\n\n' + message + '\n\nPress OK to continue,';
        confirmMsg += ' or Cancel to stay on the current page.';
        result = confirm(confirmMsg);
    }
    // arrange the continuation events
    if (result) {
        // Continue with the real action.
        var action = 'formProtectionChecked';
    } else {
        // Continue with the cancel action.
        var action = 'formProtectionFailed';
    }
    binderInstance.__continueEvent__(action, oper.node, {});
});

kukit.commandsGlobalRegistry.registerFromAction('plone-formProtectionCheck',
    kukit.cr.makeSelectorCommand);

kukit.plone.FormProtectionCheckedEvents = function() {
};

kukit.plone.FormProtectionCheckedEvents.prototype.__default_failed__ = 
    function(name, oper) {
};

kukit.eventsGlobalRegistry.register('plone', 'formProtectionChecked',
    kukit.plone.FormProtectionCheckedEvents, null, null);

kukit.eventsGlobalRegistry.register('plone', 'formProtectionFailed',
    kukit.plone.FormProtectionCheckedEvents, null, '__default_failed__');

// Form Locking

kukit.actionsGlobalRegistry.register("plone-initLockingProtection",
    function(oper) {
    oper.evaluateParameters([], {}, 'plone-initLockingProtection action');
    if (oper.node.tagName.toLowerCase() != 'form') {
        kukit.E = 'The plone-initLockingProtection action can only execute';
        kukit.E += ' on a form node as a target.';
        throw kukit.E;
    }
    plone.UnlockHandler.init();
});
kukit.commandsGlobalRegistry.registerFromAction('plone-initLockingProtection',
    kukit.cr.makeSelectorCommand);


kukit.actionsGlobalRegistry.register("plone-removeLockProtection",
    function(oper) {
    oper.evaluateParameters([], {}, 'plone-removeLockProtection action');
    plone.UnlockHandler.cleanup();
});
kukit.commandsGlobalRegistry.registerFromAction('plone-removeLockProtection',
    kukit.cr.makeGlobalCommand);

// Folder contents shift click selection
kukit.actionsGlobalRegistry.register("plone-initShiftDetection",
    function(oper) {
    oper.evaluateParameters([], {}, 'plone-initShiftDetection action');

    kukit.engine.stateVariables['plone-shiftdown'] = false;
    jq(document).keydown(function(e) {
        if(e.keyCode == 16)
            kukit.engine.stateVariables['plone-shiftdown'] = true;
    });

    jq(document).keyup(function(e) {
        if(e.keyCode == 16)
            kukit.engine.stateVariables['plone-shiftdown'] = false;
    });
});
kukit.commandsGlobalRegistry.registerFromAction('plone-initShiftDetection',
    kukit.cr.makeSelectorCommand);


kukit.actionsGlobalRegistry.register("plone-initCheckBoxSelection",
    function(oper) {
    oper.evaluateParameters([], {}, 'plone-initCheckBoxSelection action');
    kukit.engine.stateVariables['plone-foldercontents-firstcheckeditem'] = null;
});
kukit.commandsGlobalRegistry.registerFromAction('plone-initCheckBoxSelection',
    kukit.cr.makeSelectorCommand);


kukit.actionsGlobalRegistry.register("plone-createCheckBoxSelection",
    function(oper) {
    var actionMsg = 'plone-createCheckBoxSelection action';
    oper.evaluateParameters(['group'], {}, actionMsg);

    var node = oper.node;
    var firstItemVarName = 'plone-foldercontents-firstcheckeditem';
    var firstItem = kukit.engine.stateVariables[firstItemVarName];
    if(firstItem && kukit.engine.stateVariables['plone-shiftdown']) {
        var group = oper.parms.group;
        var allNodes = jq(group);
        var start = allNodes.index(firstItem);
        var end = allNodes.index(firstItem);
        if(start>end){
            var temp = start;
            start = end;
            end = temp;
        }
        allNodes.slice(start, end).attr('checked', firstItem.checked);
    }
    else {
        kukit.engine.stateVariables[firstItemVarName] = node;
    }
});
kukit.commandsGlobalRegistry.registerFromAction('plone-createCheckBoxSelection',
    kukit.cr.makeSelectorCommand);


kukit.actionsGlobalRegistry.register("plone-initDragAndDrop",
    function(oper) {
    oper.evaluateParameters(['table'], {}, 'plone-initDragAndDrop action');
    var table = oper.parms.table;
    ploneDnDReorder.table = jq(table);
    if (!ploneDnDReorder.table.length)
        return;
    ploneDnDReorder.rows = jq(table + " > tr," +
                              table + " > tbody > tr");
     jq(table + " > tr > td.draggable," +
        table + " > tbody > tr > td.draggable")
        .not('.notDraggable')
        .mousedown(ploneDnDReorder.doDown)
        .mouseup(ploneDnDReorder.doUp)
        .addClass("draggingHook")
        .html('::');
});
kukit.commandsGlobalRegistry.registerFromAction('plone-initDragAndDrop',
    kukit.cr.makeSelectorCommand);


// Scriptaculous Effects

if (typeof(Effect) != "undefined") {
    kukit.HASEFFECTS = 1;
} else {
    kukit.HASEFFECTS = 0;
}

if (kukit.HASEFFECTS && typeof(Effect.Transitions) != "undefined") {
    kukit.actionsGlobalRegistry.register("effect", function (oper) {
        oper.evaluateParameters([], {'type': 'fade'}, 'scriptaculous effect');
        var node = oper.node;
        if (oper.parms.type == 'fade') {
        new Effect.Fade(node);
        } else if (oper.parms.type == 'appear') {
        new Effect.Appear(node);
        } else if (oper.parms.type == 'puff') {
        new Effect.Puff(node);
        } else if (oper.parms.type == 'blinddown') {
        new Effect.BlindDown(node);
        } else if (oper.parms.type == 'blindup') {
        new Effect.BlindUp(node);
        }
    });

    kukit.commandsGlobalRegistry.registerFromAction('effect', kukit.cr.makeSelectorCommand);

    // This is terrible. We needed to copy this part
    // from prototype. Notice that I put this.$ =
    // in the beginning. Without that the function
    // declarations in IE won't overwrite each others,
    // and one of them (first or last occurence) comes
    // in. Now, we have a contradicting $ declaration
    // in Mochikit, causing the problem.

    this.$ = function $() {
      var results = [], element;
      for (var i = 0; i < arguments.length; i++) {
        element = arguments[i];
        if (typeof element == 'string')
          element = document.getElementById(element);
        results.push(Element.extend(element));
      }
      return results.length < 2 ? results[0] : results;
    };
}


// bind action menus on load


kukit.actionsGlobalRegistry.register("bindActionMenus", function (oper) {
        initializeMenus();
        kukit.logDebug('Plone menus initialized');
    });

kukit.log('Plone legacy [initializeMenus] action registered.');



// bind external links marking on load

kukit.plonelegacy = {};

if (typeof(scanforlinks) == 'undefined') {
    kukit.plonelegacy.bindExternalLinks = function() {}
    }
else {
    kukit.plonelegacy.bindExternalLinks = function() {
        scanforlinks();
        }
    }

kukit.actionsGlobalRegistry.register("bindExternalLinks", function (oper) {
        kukit.plonelegacy.bindExternalLinks();
        kukit.logDebug('Plone external links bound.');
    });

kukit.log('Plone legacy [bindExternalLinks] action registered.');





// bind collapsible sections on load


kukit.actionsGlobalRegistry.register("initializeCollapsible", function (oper) {
        activateCollapsibles();
    });

kukit.log('Plone legacy [initializeCollapsible] action registered.');




// bind toc code


kukit.actionsGlobalRegistry.register("createTableOfContents", function (oper) {
        createTableOfContents();
    });
kukit.commandsGlobalRegistry.registerFromAction('createTableOfContents', kukit.cr.makeGlobalCommand);

kukit.log('Plone [createTableOfContents] action registered.');


