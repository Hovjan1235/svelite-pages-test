
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
            : ctx.$$scope.ctx;
    }
    function get_slot_changes(definition, ctx, changed, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
            : ctx.$$scope.changed || {};
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        for (const key in attributes) {
            if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key in node) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(html, anchor = null) {
            this.e = element('div');
            this.a = anchor;
            this.u(html);
        }
        m(target, anchor = null) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(target, this.n[i], anchor);
            }
            this.t = target;
        }
        u(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        p(html) {
            this.d();
            this.u(html);
            this.m(this.t, this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    /**
     * Derived value store by synchronizing one or more readable stores and
     * applying an aggregation function over its input values.
     * @param {Stores} stores input stores
     * @param {function(Stores=, function(*)=):*}fn function callback that aggregates the values
     * @param {*=}initial_value when used asynchronously
     */
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const { navigate } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `string` starts with `search`
     * @param {string} string
     * @param {string} search
     * @return {boolean}
     */
    function startsWith(string, search) {
      return string.substr(0, search.length) === search;
    }

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Add the query to the pathname if a query is given
     * @param {string} pathname
     * @param {string} [query]
     * @return {string}
     */
    function addQuery(pathname, query) {
      return pathname + (query ? `?${query}` : "");
    }

    /**
     * Resolve URIs as though every path is a directory, no files. Relative URIs
     * in the browser can feel awkward because not only can you be "in a directory",
     * you can be "at a file", too. For example:
     *
     *  browserSpecResolve('foo', '/bar/') => /bar/foo
     *  browserSpecResolve('foo', '/bar') => /foo
     *
     * But on the command line of a file system, it's not as complicated. You can't
     * `cd` from a file, only directories. This way, links have to know less about
     * their current path. To go deeper you can do this:
     *
     *  <Link to="deeper"/>
     *  // instead of
     *  <Link to=`{${props.uri}/deeper}`/>
     *
     * Just like `cd`, if you want to go deeper from the command line, you do this:
     *
     *  cd deeper
     *  # not
     *  cd $(pwd)/deeper
     *
     * By treating every path as a directory, linking to relative paths should
     * require less contextual information and (fingers crossed) be more intuitive.
     * @param {string} to
     * @param {string} base
     * @return {string}
     */
    function resolve(to, base) {
      // /foo/bar, /baz/qux => /foo/bar
      if (startsWith(to, "/")) {
        return to;
      }

      const [toPathname, toQuery] = to.split("?");
      const [basePathname] = base.split("?");
      const toSegments = segmentize(toPathname);
      const baseSegments = segmentize(basePathname);

      // ?a=b, /users?b=c => /users?a=b
      if (toSegments[0] === "") {
        return addQuery(basePathname, toQuery);
      }

      // profile, /users/789 => /users/789/profile
      if (!startsWith(toSegments[0], ".")) {
        const pathname = baseSegments.concat(toSegments).join("/");

        return addQuery((basePathname === "/" ? "" : "/") + pathname, toQuery);
      }

      // ./       , /users/123 => /users/123
      // ../      , /users/123 => /users
      // ../..    , /users/123 => /
      // ../../one, /a/b/c/d   => /a/b/one
      // .././one , /a/b/c/d   => /a/b/c/one
      const allSegments = baseSegments.concat(toSegments);
      const segments = [];

      allSegments.forEach(segment => {
        if (segment === "..") {
          segments.pop();
        } else if (segment !== ".") {
          segments.push(segment);
        }
      });

      return addQuery("/" + segments.join("/"), toQuery);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    function shouldNavigate(event) {
      return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      );
    }

    /* node_modules\svelte-routing\src\Router.svelte generated by Svelte v3.12.1 */

    function create_fragment(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $base, $location, $routes;

    	

      let { basepath = "/", url = null } = $$props;

      const locationContext = getContext(LOCATION);
      const routerContext = getContext(ROUTER);

      const routes = writable([]); validate_store(routes, 'routes'); component_subscribe($$self, routes, $$value => { $routes = $$value; $$invalidate('$routes', $routes); });
      const activeRoute = writable(null);
      let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

      // If locationContext is not set, this is the topmost Router in the tree.
      // If the `url` prop is given we force the location to it.
      const location =
        locationContext ||
        writable(url ? { pathname: url } : globalHistory.location); validate_store(location, 'location'); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });

      // If routerContext is set, the routerBase of the parent Router
      // will be the base for this Router's descendants.
      // If routerContext is not set, the path and resolved uri will both
      // have the value of the basepath prop.
      const base = routerContext
        ? routerContext.routerBase
        : writable({
            path: basepath,
            uri: basepath
          }); validate_store(base, 'base'); component_subscribe($$self, base, $$value => { $base = $$value; $$invalidate('$base', $base); });

      const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
        // If there is no activeRoute, the routerBase will be identical to the base.
        if (activeRoute === null) {
          return base;
        }

        const { path: basepath } = base;
        const { route, uri } = activeRoute;
        // Remove the potential /* or /*splatname from
        // the end of the child Routes relative paths.
        const path = route.default ? basepath : route.path.replace(/\*.*$/, "");

        return { path, uri };
      });

      function registerRoute(route) {
        const { path: basepath } = $base;
        let { path } = route;

        // We store the original path in the _path property so we can reuse
        // it when the basepath changes. The only thing that matters is that
        // the route reference is intact, so mutation is fine.
        route._path = path;
        route.path = combinePaths(basepath, path);

        if (typeof window === "undefined") {
          // In SSR we should set the activeRoute immediately if it is a match.
          // If there are more Routes being registered after a match is found,
          // we just skip them.
          if (hasActiveRoute) {
            return;
          }

          const matchingRoute = match(route, $location.pathname);
          if (matchingRoute) {
            activeRoute.set(matchingRoute);
            hasActiveRoute = true;
          }
        } else {
          routes.update(rs => {
            rs.push(route);
            return rs;
          });
        }
      }

      function unregisterRoute(route) {
        routes.update(rs => {
          const index = rs.indexOf(route);
          rs.splice(index, 1);
          return rs;
        });
      }

      if (!locationContext) {
        // The topmost Router in the tree is responsible for updating
        // the location store and supplying it through context.
        onMount(() => {
          const unlisten = globalHistory.listen(history => {
            location.set(history.location);
          });

          return unlisten;
        });

        setContext(LOCATION, location);
      }

      setContext(ROUTER, {
        activeRoute,
        base,
        routerBase,
        registerRoute,
        unregisterRoute
      });

    	const writable_props = ['basepath', 'url'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('basepath' in $$props) $$invalidate('basepath', basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { basepath, url, hasActiveRoute, $base, $location, $routes };
    	};

    	$$self.$inject_state = $$props => {
    		if ('basepath' in $$props) $$invalidate('basepath', basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    		if ('hasActiveRoute' in $$props) hasActiveRoute = $$props.hasActiveRoute;
    		if ('$base' in $$props) base.set($base);
    		if ('$location' in $$props) location.set($location);
    		if ('$routes' in $$props) routes.set($routes);
    	};

    	$$self.$$.update = ($$dirty = { $base: 1, $routes: 1, $location: 1 }) => {
    		if ($$dirty.$base) { {
            const { path: basepath } = $base;
            routes.update(rs => {
              rs.forEach(r => (r.path = combinePaths(basepath, r._path)));
              return rs;
            });
          } }
    		if ($$dirty.$routes || $$dirty.$location) { {
            const bestMatch = pick($routes, $location.pathname);
            activeRoute.set(bestMatch);
          } }
    	};

    	return {
    		basepath,
    		url,
    		routes,
    		location,
    		base,
    		$$slots,
    		$$scope
    	};
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["basepath", "url"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Router", options, id: create_fragment.name });
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-routing\src\Route.svelte generated by Svelte v3.12.1 */

    const get_default_slot_changes = ({ routeParams, $location }) => ({ params: routeParams, location: $location });
    const get_default_slot_context = ({ routeParams, $location }) => ({
    	params: routeParams,
    	location: $location
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block_1,
    		create_else_block
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.component !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}", ctx });
    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && (changed.$$scope || changed.routeParams || changed.$location)) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, get_default_slot_changes),
    					get_slot_context(default_slot_template, ctx, get_default_slot_context)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block.name, type: "else", source: "(43:2) {:else}", ctx });
    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	var switch_instance_anchor, current;

    	var switch_instance_spread_levels = [
    		{ location: ctx.$location },
    		ctx.routeParams,
    		ctx.routeProps
    	];

    	var switch_value = ctx.component;

    	function switch_props(ctx) {
    		let switch_instance_props = {};
    		for (var i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}
    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) switch_instance.$$.fragment.c();
    			switch_instance_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var switch_instance_changes = (changed.$location || changed.routeParams || changed.routeProps) ? get_spread_update(switch_instance_spread_levels, [
    									(changed.$location) && { location: ctx.$location },
    			(changed.routeParams) && get_spread_object(ctx.routeParams),
    			(changed.routeProps) && get_spread_object(ctx.routeProps)
    								]) : {};

    			if (switch_value !== (switch_value = ctx.component)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;
    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});
    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());

    					switch_instance.$$.fragment.c();
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}

    			else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(switch_instance_anchor);
    			}

    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(41:2) {#if component !== null}", ctx });
    	return block;
    }

    function create_fragment$1(ctx) {
    	var if_block_anchor, current;

    	var if_block = (ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route) && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $activeRoute, $location;

    	

      let { path = "", component = null } = $$props;

      const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER); validate_store(activeRoute, 'activeRoute'); component_subscribe($$self, activeRoute, $$value => { $activeRoute = $$value; $$invalidate('$activeRoute', $activeRoute); });
      const location = getContext(LOCATION); validate_store(location, 'location'); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });

      const route = {
        path,
        // If no path prop is given, this Route will act as the default Route
        // that is rendered if no other Route in the Router is a match.
        default: path === ""
      };
      let routeParams = {};
      let routeProps = {};

      registerRoute(route);

      // There is no need to unregister Routes in SSR since it will all be
      // thrown away anyway.
      if (typeof window !== "undefined") {
        onDestroy(() => {
          unregisterRoute(route);
        });
      }

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$new_props) $$invalidate('path', path = $$new_props.path);
    		if ('component' in $$new_props) $$invalidate('component', component = $$new_props.component);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { path, component, routeParams, routeProps, $activeRoute, $location };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$props) $$invalidate('path', path = $$new_props.path);
    		if ('component' in $$props) $$invalidate('component', component = $$new_props.component);
    		if ('routeParams' in $$props) $$invalidate('routeParams', routeParams = $$new_props.routeParams);
    		if ('routeProps' in $$props) $$invalidate('routeProps', routeProps = $$new_props.routeProps);
    		if ('$activeRoute' in $$props) activeRoute.set($activeRoute);
    		if ('$location' in $$props) location.set($location);
    	};

    	$$self.$$.update = ($$dirty = { $activeRoute: 1, $$props: 1 }) => {
    		if ($$dirty.$activeRoute) { if ($activeRoute && $activeRoute.route === route) {
            $$invalidate('routeParams', routeParams = $activeRoute.params);
          } }
    		{
            const { path, component, ...rest } = $$props;
            $$invalidate('routeProps', routeProps = rest);
          }
    	};

    	return {
    		path,
    		component,
    		activeRoute,
    		location,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["path", "component"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Route", options, id: create_fragment$1.name });
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-routing\src\Link.svelte generated by Svelte v3.12.1 */

    const file = "node_modules\\svelte-routing\\src\\Link.svelte";

    function create_fragment$2(ctx) {
    	var a, current, dispose;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var a_levels = [
    		{ href: ctx.href },
    		{ "aria-current": ctx.ariaCurrent },
    		ctx.props
    	];

    	var a_data = {};
    	for (var i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");

    			if (default_slot) default_slot.c();

    			set_attributes(a, a_data);
    			add_location(a, file, 40, 0, 1249);
    			dispose = listen_dev(a, "click", ctx.onClick);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(a_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(a, get_spread_update(a_levels, [
    				(changed.href) && { href: ctx.href },
    				(changed.ariaCurrent) && { "aria-current": ctx.ariaCurrent },
    				(changed.props) && ctx.props
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $base, $location;

    	

      let { to = "#", replace = false, state = {}, getProps = () => ({}) } = $$props;

      const { base } = getContext(ROUTER); validate_store(base, 'base'); component_subscribe($$self, base, $$value => { $base = $$value; $$invalidate('$base', $base); });
      const location = getContext(LOCATION); validate_store(location, 'location'); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });
      const dispatch = createEventDispatcher();

      let href, isPartiallyCurrent, isCurrent, props;

      function onClick(event) {
        dispatch("click", event);

        if (shouldNavigate(event)) {
          event.preventDefault();
          // Don't push another entry to the history stack when the user
          // clicks on a Link to the page they are currently on.
          const shouldReplace = $location.pathname === href || replace;
          navigate(href, { state, replace: shouldReplace });
        }
      }

    	const writable_props = ['to', 'replace', 'state', 'getProps'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Link> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('to' in $$props) $$invalidate('to', to = $$props.to);
    		if ('replace' in $$props) $$invalidate('replace', replace = $$props.replace);
    		if ('state' in $$props) $$invalidate('state', state = $$props.state);
    		if ('getProps' in $$props) $$invalidate('getProps', getProps = $$props.getProps);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { to, replace, state, getProps, href, isPartiallyCurrent, isCurrent, props, $base, $location, ariaCurrent };
    	};

    	$$self.$inject_state = $$props => {
    		if ('to' in $$props) $$invalidate('to', to = $$props.to);
    		if ('replace' in $$props) $$invalidate('replace', replace = $$props.replace);
    		if ('state' in $$props) $$invalidate('state', state = $$props.state);
    		if ('getProps' in $$props) $$invalidate('getProps', getProps = $$props.getProps);
    		if ('href' in $$props) $$invalidate('href', href = $$props.href);
    		if ('isPartiallyCurrent' in $$props) $$invalidate('isPartiallyCurrent', isPartiallyCurrent = $$props.isPartiallyCurrent);
    		if ('isCurrent' in $$props) $$invalidate('isCurrent', isCurrent = $$props.isCurrent);
    		if ('props' in $$props) $$invalidate('props', props = $$props.props);
    		if ('$base' in $$props) base.set($base);
    		if ('$location' in $$props) location.set($location);
    		if ('ariaCurrent' in $$props) $$invalidate('ariaCurrent', ariaCurrent = $$props.ariaCurrent);
    	};

    	let ariaCurrent;

    	$$self.$$.update = ($$dirty = { to: 1, $base: 1, $location: 1, href: 1, isCurrent: 1, getProps: 1, isPartiallyCurrent: 1 }) => {
    		if ($$dirty.to || $$dirty.$base) { $$invalidate('href', href = to === "/" ? $base.uri : resolve(to, $base.uri)); }
    		if ($$dirty.$location || $$dirty.href) { $$invalidate('isPartiallyCurrent', isPartiallyCurrent = startsWith($location.pathname, href)); }
    		if ($$dirty.href || $$dirty.$location) { $$invalidate('isCurrent', isCurrent = href === $location.pathname); }
    		if ($$dirty.isCurrent) { $$invalidate('ariaCurrent', ariaCurrent = isCurrent ? "page" : undefined); }
    		if ($$dirty.getProps || $$dirty.$location || $$dirty.href || $$dirty.isPartiallyCurrent || $$dirty.isCurrent) { $$invalidate('props', props = getProps({
            location: $location,
            href,
            isPartiallyCurrent,
            isCurrent
          })); }
    	};

    	return {
    		to,
    		replace,
    		state,
    		getProps,
    		base,
    		location,
    		href,
    		props,
    		onClick,
    		ariaCurrent,
    		$$slots,
    		$$scope
    	};
    }

    class Link extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["to", "replace", "state", "getProps"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Link", options, id: create_fragment$2.name });
    	}

    	get to() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set to(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get replace() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set replace(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get state() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set state(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getProps() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getProps(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
    }

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var aos = createCommonjsModule(function (module, exports) {
    !function(e,t){module.exports=t();}(commonjsGlobal,function(){return function(e){function t(o){if(n[o])return n[o].exports;var i=n[o]={exports:{},id:o,loaded:!1};return e[o].call(i.exports,i,i.exports,t),i.loaded=!0,i.exports}var n={};return t.m=e,t.c=n,t.p="dist/",t(0)}([function(e,t,n){function o(e){return e&&e.__esModule?e:{default:e}}var i=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(e[o]=n[o]);}return e},r=n(1),a=(o(r),n(6)),u=o(a),c=n(7),s=o(c),f=n(8),d=o(f),l=n(9),p=o(l),m=n(10),b=o(m),v=n(11),y=o(v),g=n(14),h=o(g),w=[],k=!1,x={offset:120,delay:0,easing:"ease",duration:400,disable:!1,once:!1,startEvent:"DOMContentLoaded",throttleDelay:99,debounceDelay:50,disableMutationObserver:!1},j=function(){var e=arguments.length>0&&void 0!==arguments[0]&&arguments[0];if(e&&(k=!0),k)return w=(0, y.default)(w,x),(0, b.default)(w,x.once),w},O=function(){w=(0, h.default)(),j();},M=function(){w.forEach(function(e,t){e.node.removeAttribute("data-aos"),e.node.removeAttribute("data-aos-easing"),e.node.removeAttribute("data-aos-duration"),e.node.removeAttribute("data-aos-delay");});},S=function(e){return e===!0||"mobile"===e&&p.default.mobile()||"phone"===e&&p.default.phone()||"tablet"===e&&p.default.tablet()||"function"==typeof e&&e()===!0},_=function(e){x=i(x,e),w=(0, h.default)();var t=document.all&&!window.atob;return S(x.disable)||t?M():(x.disableMutationObserver||d.default.isSupported()||(console.info('\n      aos: MutationObserver is not supported on this browser,\n      code mutations observing has been disabled.\n      You may have to call "refreshHard()" by yourself.\n    '),x.disableMutationObserver=!0),document.querySelector("body").setAttribute("data-aos-easing",x.easing),document.querySelector("body").setAttribute("data-aos-duration",x.duration),document.querySelector("body").setAttribute("data-aos-delay",x.delay),"DOMContentLoaded"===x.startEvent&&["complete","interactive"].indexOf(document.readyState)>-1?j(!0):"load"===x.startEvent?window.addEventListener(x.startEvent,function(){j(!0);}):document.addEventListener(x.startEvent,function(){j(!0);}),window.addEventListener("resize",(0, s.default)(j,x.debounceDelay,!0)),window.addEventListener("orientationchange",(0, s.default)(j,x.debounceDelay,!0)),window.addEventListener("scroll",(0, u.default)(function(){(0, b.default)(w,x.once);},x.throttleDelay)),x.disableMutationObserver||d.default.ready("[data-aos]",O),w)};e.exports={init:_,refresh:j,refreshHard:O};},function(e,t){},,,,,function(e,t){(function(t){function n(e,t,n){function o(t){var n=b,o=v;return b=v=void 0,k=t,g=e.apply(o,n)}function r(e){return k=e,h=setTimeout(f,t),M?o(e):g}function a(e){var n=e-w,o=e-k,i=t-n;return S?j(i,y-o):i}function c(e){var n=e-w,o=e-k;return void 0===w||n>=t||n<0||S&&o>=y}function f(){var e=O();return c(e)?d(e):void(h=setTimeout(f,a(e)))}function d(e){return h=void 0,_&&b?o(e):(b=v=void 0,g)}function l(){void 0!==h&&clearTimeout(h),k=0,b=w=v=h=void 0;}function p(){return void 0===h?g:d(O())}function m(){var e=O(),n=c(e);if(b=arguments,v=this,w=e,n){if(void 0===h)return r(w);if(S)return h=setTimeout(f,t),o(w)}return void 0===h&&(h=setTimeout(f,t)),g}var b,v,y,g,h,w,k=0,M=!1,S=!1,_=!0;if("function"!=typeof e)throw new TypeError(s);return t=u(t)||0,i(n)&&(M=!!n.leading,S="maxWait"in n,y=S?x(u(n.maxWait)||0,t):y,_="trailing"in n?!!n.trailing:_),m.cancel=l,m.flush=p,m}function o(e,t,o){var r=!0,a=!0;if("function"!=typeof e)throw new TypeError(s);return i(o)&&(r="leading"in o?!!o.leading:r,a="trailing"in o?!!o.trailing:a),n(e,t,{leading:r,maxWait:t,trailing:a})}function i(e){var t="undefined"==typeof e?"undefined":c(e);return !!e&&("object"==t||"function"==t)}function r(e){return !!e&&"object"==("undefined"==typeof e?"undefined":c(e))}function a(e){return "symbol"==("undefined"==typeof e?"undefined":c(e))||r(e)&&k.call(e)==d}function u(e){if("number"==typeof e)return e;if(a(e))return f;if(i(e)){var t="function"==typeof e.valueOf?e.valueOf():e;e=i(t)?t+"":t;}if("string"!=typeof e)return 0===e?e:+e;e=e.replace(l,"");var n=m.test(e);return n||b.test(e)?v(e.slice(2),n?2:8):p.test(e)?f:+e}var c="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},s="Expected a function",f=NaN,d="[object Symbol]",l=/^\s+|\s+$/g,p=/^[-+]0x[0-9a-f]+$/i,m=/^0b[01]+$/i,b=/^0o[0-7]+$/i,v=parseInt,y="object"==("undefined"==typeof t?"undefined":c(t))&&t&&t.Object===Object&&t,g="object"==("undefined"==typeof self?"undefined":c(self))&&self&&self.Object===Object&&self,h=y||g||Function("return this")(),w=Object.prototype,k=w.toString,x=Math.max,j=Math.min,O=function(){return h.Date.now()};e.exports=o;}).call(t,function(){return this}());},function(e,t){(function(t){function n(e,t,n){function i(t){var n=b,o=v;return b=v=void 0,O=t,g=e.apply(o,n)}function r(e){return O=e,h=setTimeout(f,t),M?i(e):g}function u(e){var n=e-w,o=e-O,i=t-n;return S?x(i,y-o):i}function s(e){var n=e-w,o=e-O;return void 0===w||n>=t||n<0||S&&o>=y}function f(){var e=j();return s(e)?d(e):void(h=setTimeout(f,u(e)))}function d(e){return h=void 0,_&&b?i(e):(b=v=void 0,g)}function l(){void 0!==h&&clearTimeout(h),O=0,b=w=v=h=void 0;}function p(){return void 0===h?g:d(j())}function m(){var e=j(),n=s(e);if(b=arguments,v=this,w=e,n){if(void 0===h)return r(w);if(S)return h=setTimeout(f,t),i(w)}return void 0===h&&(h=setTimeout(f,t)),g}var b,v,y,g,h,w,O=0,M=!1,S=!1,_=!0;if("function"!=typeof e)throw new TypeError(c);return t=a(t)||0,o(n)&&(M=!!n.leading,S="maxWait"in n,y=S?k(a(n.maxWait)||0,t):y,_="trailing"in n?!!n.trailing:_),m.cancel=l,m.flush=p,m}function o(e){var t="undefined"==typeof e?"undefined":u(e);return !!e&&("object"==t||"function"==t)}function i(e){return !!e&&"object"==("undefined"==typeof e?"undefined":u(e))}function r(e){return "symbol"==("undefined"==typeof e?"undefined":u(e))||i(e)&&w.call(e)==f}function a(e){if("number"==typeof e)return e;if(r(e))return s;if(o(e)){var t="function"==typeof e.valueOf?e.valueOf():e;e=o(t)?t+"":t;}if("string"!=typeof e)return 0===e?e:+e;e=e.replace(d,"");var n=p.test(e);return n||m.test(e)?b(e.slice(2),n?2:8):l.test(e)?s:+e}var u="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},c="Expected a function",s=NaN,f="[object Symbol]",d=/^\s+|\s+$/g,l=/^[-+]0x[0-9a-f]+$/i,p=/^0b[01]+$/i,m=/^0o[0-7]+$/i,b=parseInt,v="object"==("undefined"==typeof t?"undefined":u(t))&&t&&t.Object===Object&&t,y="object"==("undefined"==typeof self?"undefined":u(self))&&self&&self.Object===Object&&self,g=v||y||Function("return this")(),h=Object.prototype,w=h.toString,k=Math.max,x=Math.min,j=function(){return g.Date.now()};e.exports=n;}).call(t,function(){return this}());},function(e,t){function n(e){var t=void 0,o=void 0,i=void 0;for(t=0;t<e.length;t+=1){if(o=e[t],o.dataset&&o.dataset.aos)return !0;if(i=o.children&&n(o.children))return !0}return !1}function o(){return window.MutationObserver||window.WebKitMutationObserver||window.MozMutationObserver}function i(){return !!o()}function r(e,t){var n=window.document,i=o(),r=new i(a);u=t,r.observe(n.documentElement,{childList:!0,subtree:!0,removedNodes:!0});}function a(e){e&&e.forEach(function(e){var t=Array.prototype.slice.call(e.addedNodes),o=Array.prototype.slice.call(e.removedNodes),i=t.concat(o);if(n(i))return u()});}Object.defineProperty(t,"__esModule",{value:!0});var u=function(){};t.default={isSupported:i,ready:r};},function(e,t){function n(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function o(){return navigator.userAgent||navigator.vendor||window.opera||""}Object.defineProperty(t,"__esModule",{value:!0});var i=function(){function e(e,t){for(var n=0;n<t.length;n++){var o=t[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(e,o.key,o);}}return function(t,n,o){return n&&e(t.prototype,n),o&&e(t,o),t}}(),r=/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i,a=/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i,u=/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i,c=/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i,s=function(){function e(){n(this,e);}return i(e,[{key:"phone",value:function(){var e=o();return !(!r.test(e)&&!a.test(e.substr(0,4)))}},{key:"mobile",value:function(){var e=o();return !(!u.test(e)&&!c.test(e.substr(0,4)))}},{key:"tablet",value:function(){return this.mobile()&&!this.phone()}}]),e}();t.default=new s;},function(e,t){Object.defineProperty(t,"__esModule",{value:!0});var n=function(e,t,n){var o=e.node.getAttribute("data-aos-once");t>e.position?e.node.classList.add("aos-animate"):"undefined"!=typeof o&&("false"===o||!n&&"true"!==o)&&e.node.classList.remove("aos-animate");},o=function(e,t){var o=window.pageYOffset,i=window.innerHeight;e.forEach(function(e,r){n(e,i+o,t);});};t.default=o;},function(e,t,n){function o(e){return e&&e.__esModule?e:{default:e}}Object.defineProperty(t,"__esModule",{value:!0});var i=n(12),r=o(i),a=function(e,t){return e.forEach(function(e,n){e.node.classList.add("aos-init"),e.position=(0, r.default)(e.node,t.offset);}),e};t.default=a;},function(e,t,n){function o(e){return e&&e.__esModule?e:{default:e}}Object.defineProperty(t,"__esModule",{value:!0});var i=n(13),r=o(i),a=function(e,t){var n=0,o=0,i=window.innerHeight,a={offset:e.getAttribute("data-aos-offset"),anchor:e.getAttribute("data-aos-anchor"),anchorPlacement:e.getAttribute("data-aos-anchor-placement")};switch(a.offset&&!isNaN(a.offset)&&(o=parseInt(a.offset)),a.anchor&&document.querySelectorAll(a.anchor)&&(e=document.querySelectorAll(a.anchor)[0]),n=(0, r.default)(e).top,a.anchorPlacement){case"top-bottom":break;case"center-bottom":n+=e.offsetHeight/2;break;case"bottom-bottom":n+=e.offsetHeight;break;case"top-center":n+=i/2;break;case"bottom-center":n+=i/2+e.offsetHeight;break;case"center-center":n+=i/2+e.offsetHeight/2;break;case"top-top":n+=i;break;case"bottom-top":n+=e.offsetHeight+i;break;case"center-top":n+=e.offsetHeight/2+i;}return a.anchorPlacement||a.offset||isNaN(t)||(o=t),n+o};t.default=a;},function(e,t){Object.defineProperty(t,"__esModule",{value:!0});var n=function(e){for(var t=0,n=0;e&&!isNaN(e.offsetLeft)&&!isNaN(e.offsetTop);)t+=e.offsetLeft-("BODY"!=e.tagName?e.scrollLeft:0),n+=e.offsetTop-("BODY"!=e.tagName?e.scrollTop:0),e=e.offsetParent;return {top:n,left:t}};t.default=n;},function(e,t){Object.defineProperty(t,"__esModule",{value:!0});var n=function(e){return e=e||document.querySelectorAll("[data-aos]"),Array.prototype.map.call(e,function(e){return {node:e}})};t.default=n;}])});
    });

    var AOS = unwrapExports(aos);
    var aos_1 = aos.AOS;

    var moment = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
         module.exports = factory() ;
    }(commonjsGlobal, (function () {
        var hookCallback;

        function hooks() {
            return hookCallback.apply(null, arguments);
        }

        // This is done to register the method called with moment()
        // without creating circular dependencies.
        function setHookCallback(callback) {
            hookCallback = callback;
        }

        function isArray(input) {
            return (
                input instanceof Array ||
                Object.prototype.toString.call(input) === '[object Array]'
            );
        }

        function isObject(input) {
            // IE8 will treat undefined and null as object if it wasn't for
            // input != null
            return (
                input != null &&
                Object.prototype.toString.call(input) === '[object Object]'
            );
        }

        function hasOwnProp(a, b) {
            return Object.prototype.hasOwnProperty.call(a, b);
        }

        function isObjectEmpty(obj) {
            if (Object.getOwnPropertyNames) {
                return Object.getOwnPropertyNames(obj).length === 0;
            } else {
                var k;
                for (k in obj) {
                    if (hasOwnProp(obj, k)) {
                        return false;
                    }
                }
                return true;
            }
        }

        function isUndefined(input) {
            return input === void 0;
        }

        function isNumber(input) {
            return (
                typeof input === 'number' ||
                Object.prototype.toString.call(input) === '[object Number]'
            );
        }

        function isDate(input) {
            return (
                input instanceof Date ||
                Object.prototype.toString.call(input) === '[object Date]'
            );
        }

        function map(arr, fn) {
            var res = [],
                i,
                arrLen = arr.length;
            for (i = 0; i < arrLen; ++i) {
                res.push(fn(arr[i], i));
            }
            return res;
        }

        function extend(a, b) {
            for (var i in b) {
                if (hasOwnProp(b, i)) {
                    a[i] = b[i];
                }
            }

            if (hasOwnProp(b, 'toString')) {
                a.toString = b.toString;
            }

            if (hasOwnProp(b, 'valueOf')) {
                a.valueOf = b.valueOf;
            }

            return a;
        }

        function createUTC(input, format, locale, strict) {
            return createLocalOrUTC(input, format, locale, strict, true).utc();
        }

        function defaultParsingFlags() {
            // We need to deep clone this object.
            return {
                empty: false,
                unusedTokens: [],
                unusedInput: [],
                overflow: -2,
                charsLeftOver: 0,
                nullInput: false,
                invalidEra: null,
                invalidMonth: null,
                invalidFormat: false,
                userInvalidated: false,
                iso: false,
                parsedDateParts: [],
                era: null,
                meridiem: null,
                rfc2822: false,
                weekdayMismatch: false,
            };
        }

        function getParsingFlags(m) {
            if (m._pf == null) {
                m._pf = defaultParsingFlags();
            }
            return m._pf;
        }

        var some;
        if (Array.prototype.some) {
            some = Array.prototype.some;
        } else {
            some = function (fun) {
                var t = Object(this),
                    len = t.length >>> 0,
                    i;

                for (i = 0; i < len; i++) {
                    if (i in t && fun.call(this, t[i], i, t)) {
                        return true;
                    }
                }

                return false;
            };
        }

        function isValid(m) {
            if (m._isValid == null) {
                var flags = getParsingFlags(m),
                    parsedParts = some.call(flags.parsedDateParts, function (i) {
                        return i != null;
                    }),
                    isNowValid =
                        !isNaN(m._d.getTime()) &&
                        flags.overflow < 0 &&
                        !flags.empty &&
                        !flags.invalidEra &&
                        !flags.invalidMonth &&
                        !flags.invalidWeekday &&
                        !flags.weekdayMismatch &&
                        !flags.nullInput &&
                        !flags.invalidFormat &&
                        !flags.userInvalidated &&
                        (!flags.meridiem || (flags.meridiem && parsedParts));

                if (m._strict) {
                    isNowValid =
                        isNowValid &&
                        flags.charsLeftOver === 0 &&
                        flags.unusedTokens.length === 0 &&
                        flags.bigHour === undefined;
                }

                if (Object.isFrozen == null || !Object.isFrozen(m)) {
                    m._isValid = isNowValid;
                } else {
                    return isNowValid;
                }
            }
            return m._isValid;
        }

        function createInvalid(flags) {
            var m = createUTC(NaN);
            if (flags != null) {
                extend(getParsingFlags(m), flags);
            } else {
                getParsingFlags(m).userInvalidated = true;
            }

            return m;
        }

        // Plugins that add properties should also add the key here (null value),
        // so we can properly clone ourselves.
        var momentProperties = (hooks.momentProperties = []),
            updateInProgress = false;

        function copyConfig(to, from) {
            var i,
                prop,
                val,
                momentPropertiesLen = momentProperties.length;

            if (!isUndefined(from._isAMomentObject)) {
                to._isAMomentObject = from._isAMomentObject;
            }
            if (!isUndefined(from._i)) {
                to._i = from._i;
            }
            if (!isUndefined(from._f)) {
                to._f = from._f;
            }
            if (!isUndefined(from._l)) {
                to._l = from._l;
            }
            if (!isUndefined(from._strict)) {
                to._strict = from._strict;
            }
            if (!isUndefined(from._tzm)) {
                to._tzm = from._tzm;
            }
            if (!isUndefined(from._isUTC)) {
                to._isUTC = from._isUTC;
            }
            if (!isUndefined(from._offset)) {
                to._offset = from._offset;
            }
            if (!isUndefined(from._pf)) {
                to._pf = getParsingFlags(from);
            }
            if (!isUndefined(from._locale)) {
                to._locale = from._locale;
            }

            if (momentPropertiesLen > 0) {
                for (i = 0; i < momentPropertiesLen; i++) {
                    prop = momentProperties[i];
                    val = from[prop];
                    if (!isUndefined(val)) {
                        to[prop] = val;
                    }
                }
            }

            return to;
        }

        // Moment prototype object
        function Moment(config) {
            copyConfig(this, config);
            this._d = new Date(config._d != null ? config._d.getTime() : NaN);
            if (!this.isValid()) {
                this._d = new Date(NaN);
            }
            // Prevent infinite loop in case updateOffset creates new moment
            // objects.
            if (updateInProgress === false) {
                updateInProgress = true;
                hooks.updateOffset(this);
                updateInProgress = false;
            }
        }

        function isMoment(obj) {
            return (
                obj instanceof Moment || (obj != null && obj._isAMomentObject != null)
            );
        }

        function warn(msg) {
            if (
                hooks.suppressDeprecationWarnings === false &&
                typeof console !== 'undefined' &&
                console.warn
            ) {
                console.warn('Deprecation warning: ' + msg);
            }
        }

        function deprecate(msg, fn) {
            var firstTime = true;

            return extend(function () {
                if (hooks.deprecationHandler != null) {
                    hooks.deprecationHandler(null, msg);
                }
                if (firstTime) {
                    var args = [],
                        arg,
                        i,
                        key,
                        argLen = arguments.length;
                    for (i = 0; i < argLen; i++) {
                        arg = '';
                        if (typeof arguments[i] === 'object') {
                            arg += '\n[' + i + '] ';
                            for (key in arguments[0]) {
                                if (hasOwnProp(arguments[0], key)) {
                                    arg += key + ': ' + arguments[0][key] + ', ';
                                }
                            }
                            arg = arg.slice(0, -2); // Remove trailing comma and space
                        } else {
                            arg = arguments[i];
                        }
                        args.push(arg);
                    }
                    warn(
                        msg +
                            '\nArguments: ' +
                            Array.prototype.slice.call(args).join('') +
                            '\n' +
                            new Error().stack
                    );
                    firstTime = false;
                }
                return fn.apply(this, arguments);
            }, fn);
        }

        var deprecations = {};

        function deprecateSimple(name, msg) {
            if (hooks.deprecationHandler != null) {
                hooks.deprecationHandler(name, msg);
            }
            if (!deprecations[name]) {
                warn(msg);
                deprecations[name] = true;
            }
        }

        hooks.suppressDeprecationWarnings = false;
        hooks.deprecationHandler = null;

        function isFunction(input) {
            return (
                (typeof Function !== 'undefined' && input instanceof Function) ||
                Object.prototype.toString.call(input) === '[object Function]'
            );
        }

        function set(config) {
            var prop, i;
            for (i in config) {
                if (hasOwnProp(config, i)) {
                    prop = config[i];
                    if (isFunction(prop)) {
                        this[i] = prop;
                    } else {
                        this['_' + i] = prop;
                    }
                }
            }
            this._config = config;
            // Lenient ordinal parsing accepts just a number in addition to
            // number + (possibly) stuff coming from _dayOfMonthOrdinalParse.
            // TODO: Remove "ordinalParse" fallback in next major release.
            this._dayOfMonthOrdinalParseLenient = new RegExp(
                (this._dayOfMonthOrdinalParse.source || this._ordinalParse.source) +
                    '|' +
                    /\d{1,2}/.source
            );
        }

        function mergeConfigs(parentConfig, childConfig) {
            var res = extend({}, parentConfig),
                prop;
            for (prop in childConfig) {
                if (hasOwnProp(childConfig, prop)) {
                    if (isObject(parentConfig[prop]) && isObject(childConfig[prop])) {
                        res[prop] = {};
                        extend(res[prop], parentConfig[prop]);
                        extend(res[prop], childConfig[prop]);
                    } else if (childConfig[prop] != null) {
                        res[prop] = childConfig[prop];
                    } else {
                        delete res[prop];
                    }
                }
            }
            for (prop in parentConfig) {
                if (
                    hasOwnProp(parentConfig, prop) &&
                    !hasOwnProp(childConfig, prop) &&
                    isObject(parentConfig[prop])
                ) {
                    // make sure changes to properties don't modify parent config
                    res[prop] = extend({}, res[prop]);
                }
            }
            return res;
        }

        function Locale(config) {
            if (config != null) {
                this.set(config);
            }
        }

        var keys;

        if (Object.keys) {
            keys = Object.keys;
        } else {
            keys = function (obj) {
                var i,
                    res = [];
                for (i in obj) {
                    if (hasOwnProp(obj, i)) {
                        res.push(i);
                    }
                }
                return res;
            };
        }

        var defaultCalendar = {
            sameDay: '[Today at] LT',
            nextDay: '[Tomorrow at] LT',
            nextWeek: 'dddd [at] LT',
            lastDay: '[Yesterday at] LT',
            lastWeek: '[Last] dddd [at] LT',
            sameElse: 'L',
        };

        function calendar(key, mom, now) {
            var output = this._calendar[key] || this._calendar['sameElse'];
            return isFunction(output) ? output.call(mom, now) : output;
        }

        function zeroFill(number, targetLength, forceSign) {
            var absNumber = '' + Math.abs(number),
                zerosToFill = targetLength - absNumber.length,
                sign = number >= 0;
            return (
                (sign ? (forceSign ? '+' : '') : '-') +
                Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) +
                absNumber
            );
        }

        var formattingTokens =
                /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|N{1,5}|YYYYYY|YYYYY|YYYY|YY|y{2,4}|yo?|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g,
            localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,
            formatFunctions = {},
            formatTokenFunctions = {};

        // token:    'M'
        // padded:   ['MM', 2]
        // ordinal:  'Mo'
        // callback: function () { this.month() + 1 }
        function addFormatToken(token, padded, ordinal, callback) {
            var func = callback;
            if (typeof callback === 'string') {
                func = function () {
                    return this[callback]();
                };
            }
            if (token) {
                formatTokenFunctions[token] = func;
            }
            if (padded) {
                formatTokenFunctions[padded[0]] = function () {
                    return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
                };
            }
            if (ordinal) {
                formatTokenFunctions[ordinal] = function () {
                    return this.localeData().ordinal(
                        func.apply(this, arguments),
                        token
                    );
                };
            }
        }

        function removeFormattingTokens(input) {
            if (input.match(/\[[\s\S]/)) {
                return input.replace(/^\[|\]$/g, '');
            }
            return input.replace(/\\/g, '');
        }

        function makeFormatFunction(format) {
            var array = format.match(formattingTokens),
                i,
                length;

            for (i = 0, length = array.length; i < length; i++) {
                if (formatTokenFunctions[array[i]]) {
                    array[i] = formatTokenFunctions[array[i]];
                } else {
                    array[i] = removeFormattingTokens(array[i]);
                }
            }

            return function (mom) {
                var output = '',
                    i;
                for (i = 0; i < length; i++) {
                    output += isFunction(array[i])
                        ? array[i].call(mom, format)
                        : array[i];
                }
                return output;
            };
        }

        // format date using native date object
        function formatMoment(m, format) {
            if (!m.isValid()) {
                return m.localeData().invalidDate();
            }

            format = expandFormat(format, m.localeData());
            formatFunctions[format] =
                formatFunctions[format] || makeFormatFunction(format);

            return formatFunctions[format](m);
        }

        function expandFormat(format, locale) {
            var i = 5;

            function replaceLongDateFormatTokens(input) {
                return locale.longDateFormat(input) || input;
            }

            localFormattingTokens.lastIndex = 0;
            while (i >= 0 && localFormattingTokens.test(format)) {
                format = format.replace(
                    localFormattingTokens,
                    replaceLongDateFormatTokens
                );
                localFormattingTokens.lastIndex = 0;
                i -= 1;
            }

            return format;
        }

        var defaultLongDateFormat = {
            LTS: 'h:mm:ss A',
            LT: 'h:mm A',
            L: 'MM/DD/YYYY',
            LL: 'MMMM D, YYYY',
            LLL: 'MMMM D, YYYY h:mm A',
            LLLL: 'dddd, MMMM D, YYYY h:mm A',
        };

        function longDateFormat(key) {
            var format = this._longDateFormat[key],
                formatUpper = this._longDateFormat[key.toUpperCase()];

            if (format || !formatUpper) {
                return format;
            }

            this._longDateFormat[key] = formatUpper
                .match(formattingTokens)
                .map(function (tok) {
                    if (
                        tok === 'MMMM' ||
                        tok === 'MM' ||
                        tok === 'DD' ||
                        tok === 'dddd'
                    ) {
                        return tok.slice(1);
                    }
                    return tok;
                })
                .join('');

            return this._longDateFormat[key];
        }

        var defaultInvalidDate = 'Invalid date';

        function invalidDate() {
            return this._invalidDate;
        }

        var defaultOrdinal = '%d',
            defaultDayOfMonthOrdinalParse = /\d{1,2}/;

        function ordinal(number) {
            return this._ordinal.replace('%d', number);
        }

        var defaultRelativeTime = {
            future: 'in %s',
            past: '%s ago',
            s: 'a few seconds',
            ss: '%d seconds',
            m: 'a minute',
            mm: '%d minutes',
            h: 'an hour',
            hh: '%d hours',
            d: 'a day',
            dd: '%d days',
            w: 'a week',
            ww: '%d weeks',
            M: 'a month',
            MM: '%d months',
            y: 'a year',
            yy: '%d years',
        };

        function relativeTime(number, withoutSuffix, string, isFuture) {
            var output = this._relativeTime[string];
            return isFunction(output)
                ? output(number, withoutSuffix, string, isFuture)
                : output.replace(/%d/i, number);
        }

        function pastFuture(diff, output) {
            var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
            return isFunction(format) ? format(output) : format.replace(/%s/i, output);
        }

        var aliases = {};

        function addUnitAlias(unit, shorthand) {
            var lowerCase = unit.toLowerCase();
            aliases[lowerCase] = aliases[lowerCase + 's'] = aliases[shorthand] = unit;
        }

        function normalizeUnits(units) {
            return typeof units === 'string'
                ? aliases[units] || aliases[units.toLowerCase()]
                : undefined;
        }

        function normalizeObjectUnits(inputObject) {
            var normalizedInput = {},
                normalizedProp,
                prop;

            for (prop in inputObject) {
                if (hasOwnProp(inputObject, prop)) {
                    normalizedProp = normalizeUnits(prop);
                    if (normalizedProp) {
                        normalizedInput[normalizedProp] = inputObject[prop];
                    }
                }
            }

            return normalizedInput;
        }

        var priorities = {};

        function addUnitPriority(unit, priority) {
            priorities[unit] = priority;
        }

        function getPrioritizedUnits(unitsObj) {
            var units = [],
                u;
            for (u in unitsObj) {
                if (hasOwnProp(unitsObj, u)) {
                    units.push({ unit: u, priority: priorities[u] });
                }
            }
            units.sort(function (a, b) {
                return a.priority - b.priority;
            });
            return units;
        }

        function isLeapYear(year) {
            return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        }

        function absFloor(number) {
            if (number < 0) {
                // -0 -> 0
                return Math.ceil(number) || 0;
            } else {
                return Math.floor(number);
            }
        }

        function toInt(argumentForCoercion) {
            var coercedNumber = +argumentForCoercion,
                value = 0;

            if (coercedNumber !== 0 && isFinite(coercedNumber)) {
                value = absFloor(coercedNumber);
            }

            return value;
        }

        function makeGetSet(unit, keepTime) {
            return function (value) {
                if (value != null) {
                    set$1(this, unit, value);
                    hooks.updateOffset(this, keepTime);
                    return this;
                } else {
                    return get(this, unit);
                }
            };
        }

        function get(mom, unit) {
            return mom.isValid()
                ? mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]()
                : NaN;
        }

        function set$1(mom, unit, value) {
            if (mom.isValid() && !isNaN(value)) {
                if (
                    unit === 'FullYear' &&
                    isLeapYear(mom.year()) &&
                    mom.month() === 1 &&
                    mom.date() === 29
                ) {
                    value = toInt(value);
                    mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](
                        value,
                        mom.month(),
                        daysInMonth(value, mom.month())
                    );
                } else {
                    mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
                }
            }
        }

        // MOMENTS

        function stringGet(units) {
            units = normalizeUnits(units);
            if (isFunction(this[units])) {
                return this[units]();
            }
            return this;
        }

        function stringSet(units, value) {
            if (typeof units === 'object') {
                units = normalizeObjectUnits(units);
                var prioritized = getPrioritizedUnits(units),
                    i,
                    prioritizedLen = prioritized.length;
                for (i = 0; i < prioritizedLen; i++) {
                    this[prioritized[i].unit](units[prioritized[i].unit]);
                }
            } else {
                units = normalizeUnits(units);
                if (isFunction(this[units])) {
                    return this[units](value);
                }
            }
            return this;
        }

        var match1 = /\d/, //       0 - 9
            match2 = /\d\d/, //      00 - 99
            match3 = /\d{3}/, //     000 - 999
            match4 = /\d{4}/, //    0000 - 9999
            match6 = /[+-]?\d{6}/, // -999999 - 999999
            match1to2 = /\d\d?/, //       0 - 99
            match3to4 = /\d\d\d\d?/, //     999 - 9999
            match5to6 = /\d\d\d\d\d\d?/, //   99999 - 999999
            match1to3 = /\d{1,3}/, //       0 - 999
            match1to4 = /\d{1,4}/, //       0 - 9999
            match1to6 = /[+-]?\d{1,6}/, // -999999 - 999999
            matchUnsigned = /\d+/, //       0 - inf
            matchSigned = /[+-]?\d+/, //    -inf - inf
            matchOffset = /Z|[+-]\d\d:?\d\d/gi, // +00:00 -00:00 +0000 -0000 or Z
            matchShortOffset = /Z|[+-]\d\d(?::?\d\d)?/gi, // +00 -00 +00:00 -00:00 +0000 -0000 or Z
            matchTimestamp = /[+-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123
            // any word (or two) characters or numbers including two/three word month in arabic.
            // includes scottish gaelic two word and hyphenated months
            matchWord =
                /[0-9]{0,256}['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFF07\uFF10-\uFFEF]{1,256}|[\u0600-\u06FF\/]{1,256}(\s*?[\u0600-\u06FF]{1,256}){1,2}/i,
            regexes;

        regexes = {};

        function addRegexToken(token, regex, strictRegex) {
            regexes[token] = isFunction(regex)
                ? regex
                : function (isStrict, localeData) {
                      return isStrict && strictRegex ? strictRegex : regex;
                  };
        }

        function getParseRegexForToken(token, config) {
            if (!hasOwnProp(regexes, token)) {
                return new RegExp(unescapeFormat(token));
            }

            return regexes[token](config._strict, config._locale);
        }

        // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
        function unescapeFormat(s) {
            return regexEscape(
                s
                    .replace('\\', '')
                    .replace(
                        /\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g,
                        function (matched, p1, p2, p3, p4) {
                            return p1 || p2 || p3 || p4;
                        }
                    )
            );
        }

        function regexEscape(s) {
            return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        }

        var tokens = {};

        function addParseToken(token, callback) {
            var i,
                func = callback,
                tokenLen;
            if (typeof token === 'string') {
                token = [token];
            }
            if (isNumber(callback)) {
                func = function (input, array) {
                    array[callback] = toInt(input);
                };
            }
            tokenLen = token.length;
            for (i = 0; i < tokenLen; i++) {
                tokens[token[i]] = func;
            }
        }

        function addWeekParseToken(token, callback) {
            addParseToken(token, function (input, array, config, token) {
                config._w = config._w || {};
                callback(input, config._w, config, token);
            });
        }

        function addTimeToArrayFromToken(token, input, config) {
            if (input != null && hasOwnProp(tokens, token)) {
                tokens[token](input, config._a, config, token);
            }
        }

        var YEAR = 0,
            MONTH = 1,
            DATE = 2,
            HOUR = 3,
            MINUTE = 4,
            SECOND = 5,
            MILLISECOND = 6,
            WEEK = 7,
            WEEKDAY = 8;

        function mod(n, x) {
            return ((n % x) + x) % x;
        }

        var indexOf;

        if (Array.prototype.indexOf) {
            indexOf = Array.prototype.indexOf;
        } else {
            indexOf = function (o) {
                // I know
                var i;
                for (i = 0; i < this.length; ++i) {
                    if (this[i] === o) {
                        return i;
                    }
                }
                return -1;
            };
        }

        function daysInMonth(year, month) {
            if (isNaN(year) || isNaN(month)) {
                return NaN;
            }
            var modMonth = mod(month, 12);
            year += (month - modMonth) / 12;
            return modMonth === 1
                ? isLeapYear(year)
                    ? 29
                    : 28
                : 31 - ((modMonth % 7) % 2);
        }

        // FORMATTING

        addFormatToken('M', ['MM', 2], 'Mo', function () {
            return this.month() + 1;
        });

        addFormatToken('MMM', 0, 0, function (format) {
            return this.localeData().monthsShort(this, format);
        });

        addFormatToken('MMMM', 0, 0, function (format) {
            return this.localeData().months(this, format);
        });

        // ALIASES

        addUnitAlias('month', 'M');

        // PRIORITY

        addUnitPriority('month', 8);

        // PARSING

        addRegexToken('M', match1to2);
        addRegexToken('MM', match1to2, match2);
        addRegexToken('MMM', function (isStrict, locale) {
            return locale.monthsShortRegex(isStrict);
        });
        addRegexToken('MMMM', function (isStrict, locale) {
            return locale.monthsRegex(isStrict);
        });

        addParseToken(['M', 'MM'], function (input, array) {
            array[MONTH] = toInt(input) - 1;
        });

        addParseToken(['MMM', 'MMMM'], function (input, array, config, token) {
            var month = config._locale.monthsParse(input, token, config._strict);
            // if we didn't find a month name, mark the date as invalid.
            if (month != null) {
                array[MONTH] = month;
            } else {
                getParsingFlags(config).invalidMonth = input;
            }
        });

        // LOCALES

        var defaultLocaleMonths =
                'January_February_March_April_May_June_July_August_September_October_November_December'.split(
                    '_'
                ),
            defaultLocaleMonthsShort =
                'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_'),
            MONTHS_IN_FORMAT = /D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/,
            defaultMonthsShortRegex = matchWord,
            defaultMonthsRegex = matchWord;

        function localeMonths(m, format) {
            if (!m) {
                return isArray(this._months)
                    ? this._months
                    : this._months['standalone'];
            }
            return isArray(this._months)
                ? this._months[m.month()]
                : this._months[
                      (this._months.isFormat || MONTHS_IN_FORMAT).test(format)
                          ? 'format'
                          : 'standalone'
                  ][m.month()];
        }

        function localeMonthsShort(m, format) {
            if (!m) {
                return isArray(this._monthsShort)
                    ? this._monthsShort
                    : this._monthsShort['standalone'];
            }
            return isArray(this._monthsShort)
                ? this._monthsShort[m.month()]
                : this._monthsShort[
                      MONTHS_IN_FORMAT.test(format) ? 'format' : 'standalone'
                  ][m.month()];
        }

        function handleStrictParse(monthName, format, strict) {
            var i,
                ii,
                mom,
                llc = monthName.toLocaleLowerCase();
            if (!this._monthsParse) {
                // this is not used
                this._monthsParse = [];
                this._longMonthsParse = [];
                this._shortMonthsParse = [];
                for (i = 0; i < 12; ++i) {
                    mom = createUTC([2000, i]);
                    this._shortMonthsParse[i] = this.monthsShort(
                        mom,
                        ''
                    ).toLocaleLowerCase();
                    this._longMonthsParse[i] = this.months(mom, '').toLocaleLowerCase();
                }
            }

            if (strict) {
                if (format === 'MMM') {
                    ii = indexOf.call(this._shortMonthsParse, llc);
                    return ii !== -1 ? ii : null;
                } else {
                    ii = indexOf.call(this._longMonthsParse, llc);
                    return ii !== -1 ? ii : null;
                }
            } else {
                if (format === 'MMM') {
                    ii = indexOf.call(this._shortMonthsParse, llc);
                    if (ii !== -1) {
                        return ii;
                    }
                    ii = indexOf.call(this._longMonthsParse, llc);
                    return ii !== -1 ? ii : null;
                } else {
                    ii = indexOf.call(this._longMonthsParse, llc);
                    if (ii !== -1) {
                        return ii;
                    }
                    ii = indexOf.call(this._shortMonthsParse, llc);
                    return ii !== -1 ? ii : null;
                }
            }
        }

        function localeMonthsParse(monthName, format, strict) {
            var i, mom, regex;

            if (this._monthsParseExact) {
                return handleStrictParse.call(this, monthName, format, strict);
            }

            if (!this._monthsParse) {
                this._monthsParse = [];
                this._longMonthsParse = [];
                this._shortMonthsParse = [];
            }

            // TODO: add sorting
            // Sorting makes sure if one month (or abbr) is a prefix of another
            // see sorting in computeMonthsParse
            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                mom = createUTC([2000, i]);
                if (strict && !this._longMonthsParse[i]) {
                    this._longMonthsParse[i] = new RegExp(
                        '^' + this.months(mom, '').replace('.', '') + '$',
                        'i'
                    );
                    this._shortMonthsParse[i] = new RegExp(
                        '^' + this.monthsShort(mom, '').replace('.', '') + '$',
                        'i'
                    );
                }
                if (!strict && !this._monthsParse[i]) {
                    regex =
                        '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                    this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (
                    strict &&
                    format === 'MMMM' &&
                    this._longMonthsParse[i].test(monthName)
                ) {
                    return i;
                } else if (
                    strict &&
                    format === 'MMM' &&
                    this._shortMonthsParse[i].test(monthName)
                ) {
                    return i;
                } else if (!strict && this._monthsParse[i].test(monthName)) {
                    return i;
                }
            }
        }

        // MOMENTS

        function setMonth(mom, value) {
            var dayOfMonth;

            if (!mom.isValid()) {
                // No op
                return mom;
            }

            if (typeof value === 'string') {
                if (/^\d+$/.test(value)) {
                    value = toInt(value);
                } else {
                    value = mom.localeData().monthsParse(value);
                    // TODO: Another silent failure?
                    if (!isNumber(value)) {
                        return mom;
                    }
                }
            }

            dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
            mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
            return mom;
        }

        function getSetMonth(value) {
            if (value != null) {
                setMonth(this, value);
                hooks.updateOffset(this, true);
                return this;
            } else {
                return get(this, 'Month');
            }
        }

        function getDaysInMonth() {
            return daysInMonth(this.year(), this.month());
        }

        function monthsShortRegex(isStrict) {
            if (this._monthsParseExact) {
                if (!hasOwnProp(this, '_monthsRegex')) {
                    computeMonthsParse.call(this);
                }
                if (isStrict) {
                    return this._monthsShortStrictRegex;
                } else {
                    return this._monthsShortRegex;
                }
            } else {
                if (!hasOwnProp(this, '_monthsShortRegex')) {
                    this._monthsShortRegex = defaultMonthsShortRegex;
                }
                return this._monthsShortStrictRegex && isStrict
                    ? this._monthsShortStrictRegex
                    : this._monthsShortRegex;
            }
        }

        function monthsRegex(isStrict) {
            if (this._monthsParseExact) {
                if (!hasOwnProp(this, '_monthsRegex')) {
                    computeMonthsParse.call(this);
                }
                if (isStrict) {
                    return this._monthsStrictRegex;
                } else {
                    return this._monthsRegex;
                }
            } else {
                if (!hasOwnProp(this, '_monthsRegex')) {
                    this._monthsRegex = defaultMonthsRegex;
                }
                return this._monthsStrictRegex && isStrict
                    ? this._monthsStrictRegex
                    : this._monthsRegex;
            }
        }

        function computeMonthsParse() {
            function cmpLenRev(a, b) {
                return b.length - a.length;
            }

            var shortPieces = [],
                longPieces = [],
                mixedPieces = [],
                i,
                mom;
            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                mom = createUTC([2000, i]);
                shortPieces.push(this.monthsShort(mom, ''));
                longPieces.push(this.months(mom, ''));
                mixedPieces.push(this.months(mom, ''));
                mixedPieces.push(this.monthsShort(mom, ''));
            }
            // Sorting makes sure if one month (or abbr) is a prefix of another it
            // will match the longer piece.
            shortPieces.sort(cmpLenRev);
            longPieces.sort(cmpLenRev);
            mixedPieces.sort(cmpLenRev);
            for (i = 0; i < 12; i++) {
                shortPieces[i] = regexEscape(shortPieces[i]);
                longPieces[i] = regexEscape(longPieces[i]);
            }
            for (i = 0; i < 24; i++) {
                mixedPieces[i] = regexEscape(mixedPieces[i]);
            }

            this._monthsRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
            this._monthsShortRegex = this._monthsRegex;
            this._monthsStrictRegex = new RegExp(
                '^(' + longPieces.join('|') + ')',
                'i'
            );
            this._monthsShortStrictRegex = new RegExp(
                '^(' + shortPieces.join('|') + ')',
                'i'
            );
        }

        // FORMATTING

        addFormatToken('Y', 0, 0, function () {
            var y = this.year();
            return y <= 9999 ? zeroFill(y, 4) : '+' + y;
        });

        addFormatToken(0, ['YY', 2], 0, function () {
            return this.year() % 100;
        });

        addFormatToken(0, ['YYYY', 4], 0, 'year');
        addFormatToken(0, ['YYYYY', 5], 0, 'year');
        addFormatToken(0, ['YYYYYY', 6, true], 0, 'year');

        // ALIASES

        addUnitAlias('year', 'y');

        // PRIORITIES

        addUnitPriority('year', 1);

        // PARSING

        addRegexToken('Y', matchSigned);
        addRegexToken('YY', match1to2, match2);
        addRegexToken('YYYY', match1to4, match4);
        addRegexToken('YYYYY', match1to6, match6);
        addRegexToken('YYYYYY', match1to6, match6);

        addParseToken(['YYYYY', 'YYYYYY'], YEAR);
        addParseToken('YYYY', function (input, array) {
            array[YEAR] =
                input.length === 2 ? hooks.parseTwoDigitYear(input) : toInt(input);
        });
        addParseToken('YY', function (input, array) {
            array[YEAR] = hooks.parseTwoDigitYear(input);
        });
        addParseToken('Y', function (input, array) {
            array[YEAR] = parseInt(input, 10);
        });

        // HELPERS

        function daysInYear(year) {
            return isLeapYear(year) ? 366 : 365;
        }

        // HOOKS

        hooks.parseTwoDigitYear = function (input) {
            return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
        };

        // MOMENTS

        var getSetYear = makeGetSet('FullYear', true);

        function getIsLeapYear() {
            return isLeapYear(this.year());
        }

        function createDate(y, m, d, h, M, s, ms) {
            // can't just apply() to create a date:
            // https://stackoverflow.com/q/181348
            var date;
            // the date constructor remaps years 0-99 to 1900-1999
            if (y < 100 && y >= 0) {
                // preserve leap years using a full 400 year cycle, then reset
                date = new Date(y + 400, m, d, h, M, s, ms);
                if (isFinite(date.getFullYear())) {
                    date.setFullYear(y);
                }
            } else {
                date = new Date(y, m, d, h, M, s, ms);
            }

            return date;
        }

        function createUTCDate(y) {
            var date, args;
            // the Date.UTC function remaps years 0-99 to 1900-1999
            if (y < 100 && y >= 0) {
                args = Array.prototype.slice.call(arguments);
                // preserve leap years using a full 400 year cycle, then reset
                args[0] = y + 400;
                date = new Date(Date.UTC.apply(null, args));
                if (isFinite(date.getUTCFullYear())) {
                    date.setUTCFullYear(y);
                }
            } else {
                date = new Date(Date.UTC.apply(null, arguments));
            }

            return date;
        }

        // start-of-first-week - start-of-year
        function firstWeekOffset(year, dow, doy) {
            var // first-week day -- which january is always in the first week (4 for iso, 1 for other)
                fwd = 7 + dow - doy,
                // first-week day local weekday -- which local weekday is fwd
                fwdlw = (7 + createUTCDate(year, 0, fwd).getUTCDay() - dow) % 7;

            return -fwdlw + fwd - 1;
        }

        // https://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
        function dayOfYearFromWeeks(year, week, weekday, dow, doy) {
            var localWeekday = (7 + weekday - dow) % 7,
                weekOffset = firstWeekOffset(year, dow, doy),
                dayOfYear = 1 + 7 * (week - 1) + localWeekday + weekOffset,
                resYear,
                resDayOfYear;

            if (dayOfYear <= 0) {
                resYear = year - 1;
                resDayOfYear = daysInYear(resYear) + dayOfYear;
            } else if (dayOfYear > daysInYear(year)) {
                resYear = year + 1;
                resDayOfYear = dayOfYear - daysInYear(year);
            } else {
                resYear = year;
                resDayOfYear = dayOfYear;
            }

            return {
                year: resYear,
                dayOfYear: resDayOfYear,
            };
        }

        function weekOfYear(mom, dow, doy) {
            var weekOffset = firstWeekOffset(mom.year(), dow, doy),
                week = Math.floor((mom.dayOfYear() - weekOffset - 1) / 7) + 1,
                resWeek,
                resYear;

            if (week < 1) {
                resYear = mom.year() - 1;
                resWeek = week + weeksInYear(resYear, dow, doy);
            } else if (week > weeksInYear(mom.year(), dow, doy)) {
                resWeek = week - weeksInYear(mom.year(), dow, doy);
                resYear = mom.year() + 1;
            } else {
                resYear = mom.year();
                resWeek = week;
            }

            return {
                week: resWeek,
                year: resYear,
            };
        }

        function weeksInYear(year, dow, doy) {
            var weekOffset = firstWeekOffset(year, dow, doy),
                weekOffsetNext = firstWeekOffset(year + 1, dow, doy);
            return (daysInYear(year) - weekOffset + weekOffsetNext) / 7;
        }

        // FORMATTING

        addFormatToken('w', ['ww', 2], 'wo', 'week');
        addFormatToken('W', ['WW', 2], 'Wo', 'isoWeek');

        // ALIASES

        addUnitAlias('week', 'w');
        addUnitAlias('isoWeek', 'W');

        // PRIORITIES

        addUnitPriority('week', 5);
        addUnitPriority('isoWeek', 5);

        // PARSING

        addRegexToken('w', match1to2);
        addRegexToken('ww', match1to2, match2);
        addRegexToken('W', match1to2);
        addRegexToken('WW', match1to2, match2);

        addWeekParseToken(
            ['w', 'ww', 'W', 'WW'],
            function (input, week, config, token) {
                week[token.substr(0, 1)] = toInt(input);
            }
        );

        // HELPERS

        // LOCALES

        function localeWeek(mom) {
            return weekOfYear(mom, this._week.dow, this._week.doy).week;
        }

        var defaultLocaleWeek = {
            dow: 0, // Sunday is the first day of the week.
            doy: 6, // The week that contains Jan 6th is the first week of the year.
        };

        function localeFirstDayOfWeek() {
            return this._week.dow;
        }

        function localeFirstDayOfYear() {
            return this._week.doy;
        }

        // MOMENTS

        function getSetWeek(input) {
            var week = this.localeData().week(this);
            return input == null ? week : this.add((input - week) * 7, 'd');
        }

        function getSetISOWeek(input) {
            var week = weekOfYear(this, 1, 4).week;
            return input == null ? week : this.add((input - week) * 7, 'd');
        }

        // FORMATTING

        addFormatToken('d', 0, 'do', 'day');

        addFormatToken('dd', 0, 0, function (format) {
            return this.localeData().weekdaysMin(this, format);
        });

        addFormatToken('ddd', 0, 0, function (format) {
            return this.localeData().weekdaysShort(this, format);
        });

        addFormatToken('dddd', 0, 0, function (format) {
            return this.localeData().weekdays(this, format);
        });

        addFormatToken('e', 0, 0, 'weekday');
        addFormatToken('E', 0, 0, 'isoWeekday');

        // ALIASES

        addUnitAlias('day', 'd');
        addUnitAlias('weekday', 'e');
        addUnitAlias('isoWeekday', 'E');

        // PRIORITY
        addUnitPriority('day', 11);
        addUnitPriority('weekday', 11);
        addUnitPriority('isoWeekday', 11);

        // PARSING

        addRegexToken('d', match1to2);
        addRegexToken('e', match1to2);
        addRegexToken('E', match1to2);
        addRegexToken('dd', function (isStrict, locale) {
            return locale.weekdaysMinRegex(isStrict);
        });
        addRegexToken('ddd', function (isStrict, locale) {
            return locale.weekdaysShortRegex(isStrict);
        });
        addRegexToken('dddd', function (isStrict, locale) {
            return locale.weekdaysRegex(isStrict);
        });

        addWeekParseToken(['dd', 'ddd', 'dddd'], function (input, week, config, token) {
            var weekday = config._locale.weekdaysParse(input, token, config._strict);
            // if we didn't get a weekday name, mark the date as invalid
            if (weekday != null) {
                week.d = weekday;
            } else {
                getParsingFlags(config).invalidWeekday = input;
            }
        });

        addWeekParseToken(['d', 'e', 'E'], function (input, week, config, token) {
            week[token] = toInt(input);
        });

        // HELPERS

        function parseWeekday(input, locale) {
            if (typeof input !== 'string') {
                return input;
            }

            if (!isNaN(input)) {
                return parseInt(input, 10);
            }

            input = locale.weekdaysParse(input);
            if (typeof input === 'number') {
                return input;
            }

            return null;
        }

        function parseIsoWeekday(input, locale) {
            if (typeof input === 'string') {
                return locale.weekdaysParse(input) % 7 || 7;
            }
            return isNaN(input) ? null : input;
        }

        // LOCALES
        function shiftWeekdays(ws, n) {
            return ws.slice(n, 7).concat(ws.slice(0, n));
        }

        var defaultLocaleWeekdays =
                'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
            defaultLocaleWeekdaysShort = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
            defaultLocaleWeekdaysMin = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
            defaultWeekdaysRegex = matchWord,
            defaultWeekdaysShortRegex = matchWord,
            defaultWeekdaysMinRegex = matchWord;

        function localeWeekdays(m, format) {
            var weekdays = isArray(this._weekdays)
                ? this._weekdays
                : this._weekdays[
                      m && m !== true && this._weekdays.isFormat.test(format)
                          ? 'format'
                          : 'standalone'
                  ];
            return m === true
                ? shiftWeekdays(weekdays, this._week.dow)
                : m
                ? weekdays[m.day()]
                : weekdays;
        }

        function localeWeekdaysShort(m) {
            return m === true
                ? shiftWeekdays(this._weekdaysShort, this._week.dow)
                : m
                ? this._weekdaysShort[m.day()]
                : this._weekdaysShort;
        }

        function localeWeekdaysMin(m) {
            return m === true
                ? shiftWeekdays(this._weekdaysMin, this._week.dow)
                : m
                ? this._weekdaysMin[m.day()]
                : this._weekdaysMin;
        }

        function handleStrictParse$1(weekdayName, format, strict) {
            var i,
                ii,
                mom,
                llc = weekdayName.toLocaleLowerCase();
            if (!this._weekdaysParse) {
                this._weekdaysParse = [];
                this._shortWeekdaysParse = [];
                this._minWeekdaysParse = [];

                for (i = 0; i < 7; ++i) {
                    mom = createUTC([2000, 1]).day(i);
                    this._minWeekdaysParse[i] = this.weekdaysMin(
                        mom,
                        ''
                    ).toLocaleLowerCase();
                    this._shortWeekdaysParse[i] = this.weekdaysShort(
                        mom,
                        ''
                    ).toLocaleLowerCase();
                    this._weekdaysParse[i] = this.weekdays(mom, '').toLocaleLowerCase();
                }
            }

            if (strict) {
                if (format === 'dddd') {
                    ii = indexOf.call(this._weekdaysParse, llc);
                    return ii !== -1 ? ii : null;
                } else if (format === 'ddd') {
                    ii = indexOf.call(this._shortWeekdaysParse, llc);
                    return ii !== -1 ? ii : null;
                } else {
                    ii = indexOf.call(this._minWeekdaysParse, llc);
                    return ii !== -1 ? ii : null;
                }
            } else {
                if (format === 'dddd') {
                    ii = indexOf.call(this._weekdaysParse, llc);
                    if (ii !== -1) {
                        return ii;
                    }
                    ii = indexOf.call(this._shortWeekdaysParse, llc);
                    if (ii !== -1) {
                        return ii;
                    }
                    ii = indexOf.call(this._minWeekdaysParse, llc);
                    return ii !== -1 ? ii : null;
                } else if (format === 'ddd') {
                    ii = indexOf.call(this._shortWeekdaysParse, llc);
                    if (ii !== -1) {
                        return ii;
                    }
                    ii = indexOf.call(this._weekdaysParse, llc);
                    if (ii !== -1) {
                        return ii;
                    }
                    ii = indexOf.call(this._minWeekdaysParse, llc);
                    return ii !== -1 ? ii : null;
                } else {
                    ii = indexOf.call(this._minWeekdaysParse, llc);
                    if (ii !== -1) {
                        return ii;
                    }
                    ii = indexOf.call(this._weekdaysParse, llc);
                    if (ii !== -1) {
                        return ii;
                    }
                    ii = indexOf.call(this._shortWeekdaysParse, llc);
                    return ii !== -1 ? ii : null;
                }
            }
        }

        function localeWeekdaysParse(weekdayName, format, strict) {
            var i, mom, regex;

            if (this._weekdaysParseExact) {
                return handleStrictParse$1.call(this, weekdayName, format, strict);
            }

            if (!this._weekdaysParse) {
                this._weekdaysParse = [];
                this._minWeekdaysParse = [];
                this._shortWeekdaysParse = [];
                this._fullWeekdaysParse = [];
            }

            for (i = 0; i < 7; i++) {
                // make the regex if we don't have it already

                mom = createUTC([2000, 1]).day(i);
                if (strict && !this._fullWeekdaysParse[i]) {
                    this._fullWeekdaysParse[i] = new RegExp(
                        '^' + this.weekdays(mom, '').replace('.', '\\.?') + '$',
                        'i'
                    );
                    this._shortWeekdaysParse[i] = new RegExp(
                        '^' + this.weekdaysShort(mom, '').replace('.', '\\.?') + '$',
                        'i'
                    );
                    this._minWeekdaysParse[i] = new RegExp(
                        '^' + this.weekdaysMin(mom, '').replace('.', '\\.?') + '$',
                        'i'
                    );
                }
                if (!this._weekdaysParse[i]) {
                    regex =
                        '^' +
                        this.weekdays(mom, '') +
                        '|^' +
                        this.weekdaysShort(mom, '') +
                        '|^' +
                        this.weekdaysMin(mom, '');
                    this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (
                    strict &&
                    format === 'dddd' &&
                    this._fullWeekdaysParse[i].test(weekdayName)
                ) {
                    return i;
                } else if (
                    strict &&
                    format === 'ddd' &&
                    this._shortWeekdaysParse[i].test(weekdayName)
                ) {
                    return i;
                } else if (
                    strict &&
                    format === 'dd' &&
                    this._minWeekdaysParse[i].test(weekdayName)
                ) {
                    return i;
                } else if (!strict && this._weekdaysParse[i].test(weekdayName)) {
                    return i;
                }
            }
        }

        // MOMENTS

        function getSetDayOfWeek(input) {
            if (!this.isValid()) {
                return input != null ? this : NaN;
            }
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            if (input != null) {
                input = parseWeekday(input, this.localeData());
                return this.add(input - day, 'd');
            } else {
                return day;
            }
        }

        function getSetLocaleDayOfWeek(input) {
            if (!this.isValid()) {
                return input != null ? this : NaN;
            }
            var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
            return input == null ? weekday : this.add(input - weekday, 'd');
        }

        function getSetISODayOfWeek(input) {
            if (!this.isValid()) {
                return input != null ? this : NaN;
            }

            // behaves the same as moment#day except
            // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
            // as a setter, sunday should belong to the previous week.

            if (input != null) {
                var weekday = parseIsoWeekday(input, this.localeData());
                return this.day(this.day() % 7 ? weekday : weekday - 7);
            } else {
                return this.day() || 7;
            }
        }

        function weekdaysRegex(isStrict) {
            if (this._weekdaysParseExact) {
                if (!hasOwnProp(this, '_weekdaysRegex')) {
                    computeWeekdaysParse.call(this);
                }
                if (isStrict) {
                    return this._weekdaysStrictRegex;
                } else {
                    return this._weekdaysRegex;
                }
            } else {
                if (!hasOwnProp(this, '_weekdaysRegex')) {
                    this._weekdaysRegex = defaultWeekdaysRegex;
                }
                return this._weekdaysStrictRegex && isStrict
                    ? this._weekdaysStrictRegex
                    : this._weekdaysRegex;
            }
        }

        function weekdaysShortRegex(isStrict) {
            if (this._weekdaysParseExact) {
                if (!hasOwnProp(this, '_weekdaysRegex')) {
                    computeWeekdaysParse.call(this);
                }
                if (isStrict) {
                    return this._weekdaysShortStrictRegex;
                } else {
                    return this._weekdaysShortRegex;
                }
            } else {
                if (!hasOwnProp(this, '_weekdaysShortRegex')) {
                    this._weekdaysShortRegex = defaultWeekdaysShortRegex;
                }
                return this._weekdaysShortStrictRegex && isStrict
                    ? this._weekdaysShortStrictRegex
                    : this._weekdaysShortRegex;
            }
        }

        function weekdaysMinRegex(isStrict) {
            if (this._weekdaysParseExact) {
                if (!hasOwnProp(this, '_weekdaysRegex')) {
                    computeWeekdaysParse.call(this);
                }
                if (isStrict) {
                    return this._weekdaysMinStrictRegex;
                } else {
                    return this._weekdaysMinRegex;
                }
            } else {
                if (!hasOwnProp(this, '_weekdaysMinRegex')) {
                    this._weekdaysMinRegex = defaultWeekdaysMinRegex;
                }
                return this._weekdaysMinStrictRegex && isStrict
                    ? this._weekdaysMinStrictRegex
                    : this._weekdaysMinRegex;
            }
        }

        function computeWeekdaysParse() {
            function cmpLenRev(a, b) {
                return b.length - a.length;
            }

            var minPieces = [],
                shortPieces = [],
                longPieces = [],
                mixedPieces = [],
                i,
                mom,
                minp,
                shortp,
                longp;
            for (i = 0; i < 7; i++) {
                // make the regex if we don't have it already
                mom = createUTC([2000, 1]).day(i);
                minp = regexEscape(this.weekdaysMin(mom, ''));
                shortp = regexEscape(this.weekdaysShort(mom, ''));
                longp = regexEscape(this.weekdays(mom, ''));
                minPieces.push(minp);
                shortPieces.push(shortp);
                longPieces.push(longp);
                mixedPieces.push(minp);
                mixedPieces.push(shortp);
                mixedPieces.push(longp);
            }
            // Sorting makes sure if one weekday (or abbr) is a prefix of another it
            // will match the longer piece.
            minPieces.sort(cmpLenRev);
            shortPieces.sort(cmpLenRev);
            longPieces.sort(cmpLenRev);
            mixedPieces.sort(cmpLenRev);

            this._weekdaysRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
            this._weekdaysShortRegex = this._weekdaysRegex;
            this._weekdaysMinRegex = this._weekdaysRegex;

            this._weekdaysStrictRegex = new RegExp(
                '^(' + longPieces.join('|') + ')',
                'i'
            );
            this._weekdaysShortStrictRegex = new RegExp(
                '^(' + shortPieces.join('|') + ')',
                'i'
            );
            this._weekdaysMinStrictRegex = new RegExp(
                '^(' + minPieces.join('|') + ')',
                'i'
            );
        }

        // FORMATTING

        function hFormat() {
            return this.hours() % 12 || 12;
        }

        function kFormat() {
            return this.hours() || 24;
        }

        addFormatToken('H', ['HH', 2], 0, 'hour');
        addFormatToken('h', ['hh', 2], 0, hFormat);
        addFormatToken('k', ['kk', 2], 0, kFormat);

        addFormatToken('hmm', 0, 0, function () {
            return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2);
        });

        addFormatToken('hmmss', 0, 0, function () {
            return (
                '' +
                hFormat.apply(this) +
                zeroFill(this.minutes(), 2) +
                zeroFill(this.seconds(), 2)
            );
        });

        addFormatToken('Hmm', 0, 0, function () {
            return '' + this.hours() + zeroFill(this.minutes(), 2);
        });

        addFormatToken('Hmmss', 0, 0, function () {
            return (
                '' +
                this.hours() +
                zeroFill(this.minutes(), 2) +
                zeroFill(this.seconds(), 2)
            );
        });

        function meridiem(token, lowercase) {
            addFormatToken(token, 0, 0, function () {
                return this.localeData().meridiem(
                    this.hours(),
                    this.minutes(),
                    lowercase
                );
            });
        }

        meridiem('a', true);
        meridiem('A', false);

        // ALIASES

        addUnitAlias('hour', 'h');

        // PRIORITY
        addUnitPriority('hour', 13);

        // PARSING

        function matchMeridiem(isStrict, locale) {
            return locale._meridiemParse;
        }

        addRegexToken('a', matchMeridiem);
        addRegexToken('A', matchMeridiem);
        addRegexToken('H', match1to2);
        addRegexToken('h', match1to2);
        addRegexToken('k', match1to2);
        addRegexToken('HH', match1to2, match2);
        addRegexToken('hh', match1to2, match2);
        addRegexToken('kk', match1to2, match2);

        addRegexToken('hmm', match3to4);
        addRegexToken('hmmss', match5to6);
        addRegexToken('Hmm', match3to4);
        addRegexToken('Hmmss', match5to6);

        addParseToken(['H', 'HH'], HOUR);
        addParseToken(['k', 'kk'], function (input, array, config) {
            var kInput = toInt(input);
            array[HOUR] = kInput === 24 ? 0 : kInput;
        });
        addParseToken(['a', 'A'], function (input, array, config) {
            config._isPm = config._locale.isPM(input);
            config._meridiem = input;
        });
        addParseToken(['h', 'hh'], function (input, array, config) {
            array[HOUR] = toInt(input);
            getParsingFlags(config).bigHour = true;
        });
        addParseToken('hmm', function (input, array, config) {
            var pos = input.length - 2;
            array[HOUR] = toInt(input.substr(0, pos));
            array[MINUTE] = toInt(input.substr(pos));
            getParsingFlags(config).bigHour = true;
        });
        addParseToken('hmmss', function (input, array, config) {
            var pos1 = input.length - 4,
                pos2 = input.length - 2;
            array[HOUR] = toInt(input.substr(0, pos1));
            array[MINUTE] = toInt(input.substr(pos1, 2));
            array[SECOND] = toInt(input.substr(pos2));
            getParsingFlags(config).bigHour = true;
        });
        addParseToken('Hmm', function (input, array, config) {
            var pos = input.length - 2;
            array[HOUR] = toInt(input.substr(0, pos));
            array[MINUTE] = toInt(input.substr(pos));
        });
        addParseToken('Hmmss', function (input, array, config) {
            var pos1 = input.length - 4,
                pos2 = input.length - 2;
            array[HOUR] = toInt(input.substr(0, pos1));
            array[MINUTE] = toInt(input.substr(pos1, 2));
            array[SECOND] = toInt(input.substr(pos2));
        });

        // LOCALES

        function localeIsPM(input) {
            // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
            // Using charAt should be more compatible.
            return (input + '').toLowerCase().charAt(0) === 'p';
        }

        var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i,
            // Setting the hour should keep the time, because the user explicitly
            // specified which hour they want. So trying to maintain the same hour (in
            // a new timezone) makes sense. Adding/subtracting hours does not follow
            // this rule.
            getSetHour = makeGetSet('Hours', true);

        function localeMeridiem(hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'pm' : 'PM';
            } else {
                return isLower ? 'am' : 'AM';
            }
        }

        var baseConfig = {
            calendar: defaultCalendar,
            longDateFormat: defaultLongDateFormat,
            invalidDate: defaultInvalidDate,
            ordinal: defaultOrdinal,
            dayOfMonthOrdinalParse: defaultDayOfMonthOrdinalParse,
            relativeTime: defaultRelativeTime,

            months: defaultLocaleMonths,
            monthsShort: defaultLocaleMonthsShort,

            week: defaultLocaleWeek,

            weekdays: defaultLocaleWeekdays,
            weekdaysMin: defaultLocaleWeekdaysMin,
            weekdaysShort: defaultLocaleWeekdaysShort,

            meridiemParse: defaultLocaleMeridiemParse,
        };

        // internal storage for locale config files
        var locales = {},
            localeFamilies = {},
            globalLocale;

        function commonPrefix(arr1, arr2) {
            var i,
                minl = Math.min(arr1.length, arr2.length);
            for (i = 0; i < minl; i += 1) {
                if (arr1[i] !== arr2[i]) {
                    return i;
                }
            }
            return minl;
        }

        function normalizeLocale(key) {
            return key ? key.toLowerCase().replace('_', '-') : key;
        }

        // pick the locale from the array
        // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
        // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
        function chooseLocale(names) {
            var i = 0,
                j,
                next,
                locale,
                split;

            while (i < names.length) {
                split = normalizeLocale(names[i]).split('-');
                j = split.length;
                next = normalizeLocale(names[i + 1]);
                next = next ? next.split('-') : null;
                while (j > 0) {
                    locale = loadLocale(split.slice(0, j).join('-'));
                    if (locale) {
                        return locale;
                    }
                    if (
                        next &&
                        next.length >= j &&
                        commonPrefix(split, next) >= j - 1
                    ) {
                        //the next array item is better than a shallower substring of this one
                        break;
                    }
                    j--;
                }
                i++;
            }
            return globalLocale;
        }

        function isLocaleNameSane(name) {
            // Prevent names that look like filesystem paths, i.e contain '/' or '\'
            return name.match('^[^/\\\\]*$') != null;
        }

        function loadLocale(name) {
            var oldLocale = null,
                aliasedRequire;
            // TODO: Find a better way to register and load all the locales in Node
            if (
                locales[name] === undefined &&
                'object' !== 'undefined' &&
                module &&
                module.exports &&
                isLocaleNameSane(name)
            ) {
                try {
                    oldLocale = globalLocale._abbr;
                    aliasedRequire = commonjsRequire;
                    aliasedRequire('./locale/' + name);
                    getSetGlobalLocale(oldLocale);
                } catch (e) {
                    // mark as not found to avoid repeating expensive file require call causing high CPU
                    // when trying to find en-US, en_US, en-us for every format call
                    locales[name] = null; // null means not found
                }
            }
            return locales[name];
        }

        // This function will load locale and then set the global locale.  If
        // no arguments are passed in, it will simply return the current global
        // locale key.
        function getSetGlobalLocale(key, values) {
            var data;
            if (key) {
                if (isUndefined(values)) {
                    data = getLocale(key);
                } else {
                    data = defineLocale(key, values);
                }

                if (data) {
                    // moment.duration._locale = moment._locale = data;
                    globalLocale = data;
                } else {
                    if (typeof console !== 'undefined' && console.warn) {
                        //warn user if arguments are passed but the locale could not be set
                        console.warn(
                            'Locale ' + key + ' not found. Did you forget to load it?'
                        );
                    }
                }
            }

            return globalLocale._abbr;
        }

        function defineLocale(name, config) {
            if (config !== null) {
                var locale,
                    parentConfig = baseConfig;
                config.abbr = name;
                if (locales[name] != null) {
                    deprecateSimple(
                        'defineLocaleOverride',
                        'use moment.updateLocale(localeName, config) to change ' +
                            'an existing locale. moment.defineLocale(localeName, ' +
                            'config) should only be used for creating a new locale ' +
                            'See http://momentjs.com/guides/#/warnings/define-locale/ for more info.'
                    );
                    parentConfig = locales[name]._config;
                } else if (config.parentLocale != null) {
                    if (locales[config.parentLocale] != null) {
                        parentConfig = locales[config.parentLocale]._config;
                    } else {
                        locale = loadLocale(config.parentLocale);
                        if (locale != null) {
                            parentConfig = locale._config;
                        } else {
                            if (!localeFamilies[config.parentLocale]) {
                                localeFamilies[config.parentLocale] = [];
                            }
                            localeFamilies[config.parentLocale].push({
                                name: name,
                                config: config,
                            });
                            return null;
                        }
                    }
                }
                locales[name] = new Locale(mergeConfigs(parentConfig, config));

                if (localeFamilies[name]) {
                    localeFamilies[name].forEach(function (x) {
                        defineLocale(x.name, x.config);
                    });
                }

                // backwards compat for now: also set the locale
                // make sure we set the locale AFTER all child locales have been
                // created, so we won't end up with the child locale set.
                getSetGlobalLocale(name);

                return locales[name];
            } else {
                // useful for testing
                delete locales[name];
                return null;
            }
        }

        function updateLocale(name, config) {
            if (config != null) {
                var locale,
                    tmpLocale,
                    parentConfig = baseConfig;

                if (locales[name] != null && locales[name].parentLocale != null) {
                    // Update existing child locale in-place to avoid memory-leaks
                    locales[name].set(mergeConfigs(locales[name]._config, config));
                } else {
                    // MERGE
                    tmpLocale = loadLocale(name);
                    if (tmpLocale != null) {
                        parentConfig = tmpLocale._config;
                    }
                    config = mergeConfigs(parentConfig, config);
                    if (tmpLocale == null) {
                        // updateLocale is called for creating a new locale
                        // Set abbr so it will have a name (getters return
                        // undefined otherwise).
                        config.abbr = name;
                    }
                    locale = new Locale(config);
                    locale.parentLocale = locales[name];
                    locales[name] = locale;
                }

                // backwards compat for now: also set the locale
                getSetGlobalLocale(name);
            } else {
                // pass null for config to unupdate, useful for tests
                if (locales[name] != null) {
                    if (locales[name].parentLocale != null) {
                        locales[name] = locales[name].parentLocale;
                        if (name === getSetGlobalLocale()) {
                            getSetGlobalLocale(name);
                        }
                    } else if (locales[name] != null) {
                        delete locales[name];
                    }
                }
            }
            return locales[name];
        }

        // returns locale data
        function getLocale(key) {
            var locale;

            if (key && key._locale && key._locale._abbr) {
                key = key._locale._abbr;
            }

            if (!key) {
                return globalLocale;
            }

            if (!isArray(key)) {
                //short-circuit everything else
                locale = loadLocale(key);
                if (locale) {
                    return locale;
                }
                key = [key];
            }

            return chooseLocale(key);
        }

        function listLocales() {
            return keys(locales);
        }

        function checkOverflow(m) {
            var overflow,
                a = m._a;

            if (a && getParsingFlags(m).overflow === -2) {
                overflow =
                    a[MONTH] < 0 || a[MONTH] > 11
                        ? MONTH
                        : a[DATE] < 1 || a[DATE] > daysInMonth(a[YEAR], a[MONTH])
                        ? DATE
                        : a[HOUR] < 0 ||
                          a[HOUR] > 24 ||
                          (a[HOUR] === 24 &&
                              (a[MINUTE] !== 0 ||
                                  a[SECOND] !== 0 ||
                                  a[MILLISECOND] !== 0))
                        ? HOUR
                        : a[MINUTE] < 0 || a[MINUTE] > 59
                        ? MINUTE
                        : a[SECOND] < 0 || a[SECOND] > 59
                        ? SECOND
                        : a[MILLISECOND] < 0 || a[MILLISECOND] > 999
                        ? MILLISECOND
                        : -1;

                if (
                    getParsingFlags(m)._overflowDayOfYear &&
                    (overflow < YEAR || overflow > DATE)
                ) {
                    overflow = DATE;
                }
                if (getParsingFlags(m)._overflowWeeks && overflow === -1) {
                    overflow = WEEK;
                }
                if (getParsingFlags(m)._overflowWeekday && overflow === -1) {
                    overflow = WEEKDAY;
                }

                getParsingFlags(m).overflow = overflow;
            }

            return m;
        }

        // iso 8601 regex
        // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
        var extendedIsoRegex =
                /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/,
            basicIsoRegex =
                /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d|))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/,
            tzRegex = /Z|[+-]\d\d(?::?\d\d)?/,
            isoDates = [
                ['YYYYYY-MM-DD', /[+-]\d{6}-\d\d-\d\d/],
                ['YYYY-MM-DD', /\d{4}-\d\d-\d\d/],
                ['GGGG-[W]WW-E', /\d{4}-W\d\d-\d/],
                ['GGGG-[W]WW', /\d{4}-W\d\d/, false],
                ['YYYY-DDD', /\d{4}-\d{3}/],
                ['YYYY-MM', /\d{4}-\d\d/, false],
                ['YYYYYYMMDD', /[+-]\d{10}/],
                ['YYYYMMDD', /\d{8}/],
                ['GGGG[W]WWE', /\d{4}W\d{3}/],
                ['GGGG[W]WW', /\d{4}W\d{2}/, false],
                ['YYYYDDD', /\d{7}/],
                ['YYYYMM', /\d{6}/, false],
                ['YYYY', /\d{4}/, false],
            ],
            // iso time formats and regexes
            isoTimes = [
                ['HH:mm:ss.SSSS', /\d\d:\d\d:\d\d\.\d+/],
                ['HH:mm:ss,SSSS', /\d\d:\d\d:\d\d,\d+/],
                ['HH:mm:ss', /\d\d:\d\d:\d\d/],
                ['HH:mm', /\d\d:\d\d/],
                ['HHmmss.SSSS', /\d\d\d\d\d\d\.\d+/],
                ['HHmmss,SSSS', /\d\d\d\d\d\d,\d+/],
                ['HHmmss', /\d\d\d\d\d\d/],
                ['HHmm', /\d\d\d\d/],
                ['HH', /\d\d/],
            ],
            aspNetJsonRegex = /^\/?Date\((-?\d+)/i,
            // RFC 2822 regex: For details see https://tools.ietf.org/html/rfc2822#section-3.3
            rfc2822 =
                /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/,
            obsOffsets = {
                UT: 0,
                GMT: 0,
                EDT: -4 * 60,
                EST: -5 * 60,
                CDT: -5 * 60,
                CST: -6 * 60,
                MDT: -6 * 60,
                MST: -7 * 60,
                PDT: -7 * 60,
                PST: -8 * 60,
            };

        // date from iso format
        function configFromISO(config) {
            var i,
                l,
                string = config._i,
                match = extendedIsoRegex.exec(string) || basicIsoRegex.exec(string),
                allowTime,
                dateFormat,
                timeFormat,
                tzFormat,
                isoDatesLen = isoDates.length,
                isoTimesLen = isoTimes.length;

            if (match) {
                getParsingFlags(config).iso = true;
                for (i = 0, l = isoDatesLen; i < l; i++) {
                    if (isoDates[i][1].exec(match[1])) {
                        dateFormat = isoDates[i][0];
                        allowTime = isoDates[i][2] !== false;
                        break;
                    }
                }
                if (dateFormat == null) {
                    config._isValid = false;
                    return;
                }
                if (match[3]) {
                    for (i = 0, l = isoTimesLen; i < l; i++) {
                        if (isoTimes[i][1].exec(match[3])) {
                            // match[2] should be 'T' or space
                            timeFormat = (match[2] || ' ') + isoTimes[i][0];
                            break;
                        }
                    }
                    if (timeFormat == null) {
                        config._isValid = false;
                        return;
                    }
                }
                if (!allowTime && timeFormat != null) {
                    config._isValid = false;
                    return;
                }
                if (match[4]) {
                    if (tzRegex.exec(match[4])) {
                        tzFormat = 'Z';
                    } else {
                        config._isValid = false;
                        return;
                    }
                }
                config._f = dateFormat + (timeFormat || '') + (tzFormat || '');
                configFromStringAndFormat(config);
            } else {
                config._isValid = false;
            }
        }

        function extractFromRFC2822Strings(
            yearStr,
            monthStr,
            dayStr,
            hourStr,
            minuteStr,
            secondStr
        ) {
            var result = [
                untruncateYear(yearStr),
                defaultLocaleMonthsShort.indexOf(monthStr),
                parseInt(dayStr, 10),
                parseInt(hourStr, 10),
                parseInt(minuteStr, 10),
            ];

            if (secondStr) {
                result.push(parseInt(secondStr, 10));
            }

            return result;
        }

        function untruncateYear(yearStr) {
            var year = parseInt(yearStr, 10);
            if (year <= 49) {
                return 2000 + year;
            } else if (year <= 999) {
                return 1900 + year;
            }
            return year;
        }

        function preprocessRFC2822(s) {
            // Remove comments and folding whitespace and replace multiple-spaces with a single space
            return s
                .replace(/\([^()]*\)|[\n\t]/g, ' ')
                .replace(/(\s\s+)/g, ' ')
                .replace(/^\s\s*/, '')
                .replace(/\s\s*$/, '');
        }

        function checkWeekday(weekdayStr, parsedInput, config) {
            if (weekdayStr) {
                // TODO: Replace the vanilla JS Date object with an independent day-of-week check.
                var weekdayProvided = defaultLocaleWeekdaysShort.indexOf(weekdayStr),
                    weekdayActual = new Date(
                        parsedInput[0],
                        parsedInput[1],
                        parsedInput[2]
                    ).getDay();
                if (weekdayProvided !== weekdayActual) {
                    getParsingFlags(config).weekdayMismatch = true;
                    config._isValid = false;
                    return false;
                }
            }
            return true;
        }

        function calculateOffset(obsOffset, militaryOffset, numOffset) {
            if (obsOffset) {
                return obsOffsets[obsOffset];
            } else if (militaryOffset) {
                // the only allowed military tz is Z
                return 0;
            } else {
                var hm = parseInt(numOffset, 10),
                    m = hm % 100,
                    h = (hm - m) / 100;
                return h * 60 + m;
            }
        }

        // date and time from ref 2822 format
        function configFromRFC2822(config) {
            var match = rfc2822.exec(preprocessRFC2822(config._i)),
                parsedArray;
            if (match) {
                parsedArray = extractFromRFC2822Strings(
                    match[4],
                    match[3],
                    match[2],
                    match[5],
                    match[6],
                    match[7]
                );
                if (!checkWeekday(match[1], parsedArray, config)) {
                    return;
                }

                config._a = parsedArray;
                config._tzm = calculateOffset(match[8], match[9], match[10]);

                config._d = createUTCDate.apply(null, config._a);
                config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);

                getParsingFlags(config).rfc2822 = true;
            } else {
                config._isValid = false;
            }
        }

        // date from 1) ASP.NET, 2) ISO, 3) RFC 2822 formats, or 4) optional fallback if parsing isn't strict
        function configFromString(config) {
            var matched = aspNetJsonRegex.exec(config._i);
            if (matched !== null) {
                config._d = new Date(+matched[1]);
                return;
            }

            configFromISO(config);
            if (config._isValid === false) {
                delete config._isValid;
            } else {
                return;
            }

            configFromRFC2822(config);
            if (config._isValid === false) {
                delete config._isValid;
            } else {
                return;
            }

            if (config._strict) {
                config._isValid = false;
            } else {
                // Final attempt, use Input Fallback
                hooks.createFromInputFallback(config);
            }
        }

        hooks.createFromInputFallback = deprecate(
            'value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), ' +
                'which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are ' +
                'discouraged. Please refer to http://momentjs.com/guides/#/warnings/js-date/ for more info.',
            function (config) {
                config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
            }
        );

        // Pick the first defined of two or three arguments.
        function defaults(a, b, c) {
            if (a != null) {
                return a;
            }
            if (b != null) {
                return b;
            }
            return c;
        }

        function currentDateArray(config) {
            // hooks is actually the exported moment object
            var nowValue = new Date(hooks.now());
            if (config._useUTC) {
                return [
                    nowValue.getUTCFullYear(),
                    nowValue.getUTCMonth(),
                    nowValue.getUTCDate(),
                ];
            }
            return [nowValue.getFullYear(), nowValue.getMonth(), nowValue.getDate()];
        }

        // convert an array to a date.
        // the array should mirror the parameters below
        // note: all values past the year are optional and will default to the lowest possible value.
        // [year, month, day , hour, minute, second, millisecond]
        function configFromArray(config) {
            var i,
                date,
                input = [],
                currentDate,
                expectedWeekday,
                yearToUse;

            if (config._d) {
                return;
            }

            currentDate = currentDateArray(config);

            //compute day of the year from weeks and weekdays
            if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
                dayOfYearFromWeekInfo(config);
            }

            //if the day of the year is set, figure out what it is
            if (config._dayOfYear != null) {
                yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);

                if (
                    config._dayOfYear > daysInYear(yearToUse) ||
                    config._dayOfYear === 0
                ) {
                    getParsingFlags(config)._overflowDayOfYear = true;
                }

                date = createUTCDate(yearToUse, 0, config._dayOfYear);
                config._a[MONTH] = date.getUTCMonth();
                config._a[DATE] = date.getUTCDate();
            }

            // Default to current date.
            // * if no year, month, day of month are given, default to today
            // * if day of month is given, default month and year
            // * if month is given, default only year
            // * if year is given, don't default anything
            for (i = 0; i < 3 && config._a[i] == null; ++i) {
                config._a[i] = input[i] = currentDate[i];
            }

            // Zero out whatever was not defaulted, including time
            for (; i < 7; i++) {
                config._a[i] = input[i] =
                    config._a[i] == null ? (i === 2 ? 1 : 0) : config._a[i];
            }

            // Check for 24:00:00.000
            if (
                config._a[HOUR] === 24 &&
                config._a[MINUTE] === 0 &&
                config._a[SECOND] === 0 &&
                config._a[MILLISECOND] === 0
            ) {
                config._nextDay = true;
                config._a[HOUR] = 0;
            }

            config._d = (config._useUTC ? createUTCDate : createDate).apply(
                null,
                input
            );
            expectedWeekday = config._useUTC
                ? config._d.getUTCDay()
                : config._d.getDay();

            // Apply timezone offset from input. The actual utcOffset can be changed
            // with parseZone.
            if (config._tzm != null) {
                config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
            }

            if (config._nextDay) {
                config._a[HOUR] = 24;
            }

            // check for mismatching day of week
            if (
                config._w &&
                typeof config._w.d !== 'undefined' &&
                config._w.d !== expectedWeekday
            ) {
                getParsingFlags(config).weekdayMismatch = true;
            }
        }

        function dayOfYearFromWeekInfo(config) {
            var w, weekYear, week, weekday, dow, doy, temp, weekdayOverflow, curWeek;

            w = config._w;
            if (w.GG != null || w.W != null || w.E != null) {
                dow = 1;
                doy = 4;

                // TODO: We need to take the current isoWeekYear, but that depends on
                // how we interpret now (local, utc, fixed offset). So create
                // a now version of current config (take local/utc/offset flags, and
                // create now).
                weekYear = defaults(
                    w.GG,
                    config._a[YEAR],
                    weekOfYear(createLocal(), 1, 4).year
                );
                week = defaults(w.W, 1);
                weekday = defaults(w.E, 1);
                if (weekday < 1 || weekday > 7) {
                    weekdayOverflow = true;
                }
            } else {
                dow = config._locale._week.dow;
                doy = config._locale._week.doy;

                curWeek = weekOfYear(createLocal(), dow, doy);

                weekYear = defaults(w.gg, config._a[YEAR], curWeek.year);

                // Default to current week.
                week = defaults(w.w, curWeek.week);

                if (w.d != null) {
                    // weekday -- low day numbers are considered next week
                    weekday = w.d;
                    if (weekday < 0 || weekday > 6) {
                        weekdayOverflow = true;
                    }
                } else if (w.e != null) {
                    // local weekday -- counting starts from beginning of week
                    weekday = w.e + dow;
                    if (w.e < 0 || w.e > 6) {
                        weekdayOverflow = true;
                    }
                } else {
                    // default to beginning of week
                    weekday = dow;
                }
            }
            if (week < 1 || week > weeksInYear(weekYear, dow, doy)) {
                getParsingFlags(config)._overflowWeeks = true;
            } else if (weekdayOverflow != null) {
                getParsingFlags(config)._overflowWeekday = true;
            } else {
                temp = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
                config._a[YEAR] = temp.year;
                config._dayOfYear = temp.dayOfYear;
            }
        }

        // constant that refers to the ISO standard
        hooks.ISO_8601 = function () {};

        // constant that refers to the RFC 2822 form
        hooks.RFC_2822 = function () {};

        // date from string and format string
        function configFromStringAndFormat(config) {
            // TODO: Move this to another part of the creation flow to prevent circular deps
            if (config._f === hooks.ISO_8601) {
                configFromISO(config);
                return;
            }
            if (config._f === hooks.RFC_2822) {
                configFromRFC2822(config);
                return;
            }
            config._a = [];
            getParsingFlags(config).empty = true;

            // This array is used to make a Date, either with `new Date` or `Date.UTC`
            var string = '' + config._i,
                i,
                parsedInput,
                tokens,
                token,
                skipped,
                stringLength = string.length,
                totalParsedInputLength = 0,
                era,
                tokenLen;

            tokens =
                expandFormat(config._f, config._locale).match(formattingTokens) || [];
            tokenLen = tokens.length;
            for (i = 0; i < tokenLen; i++) {
                token = tokens[i];
                parsedInput = (string.match(getParseRegexForToken(token, config)) ||
                    [])[0];
                if (parsedInput) {
                    skipped = string.substr(0, string.indexOf(parsedInput));
                    if (skipped.length > 0) {
                        getParsingFlags(config).unusedInput.push(skipped);
                    }
                    string = string.slice(
                        string.indexOf(parsedInput) + parsedInput.length
                    );
                    totalParsedInputLength += parsedInput.length;
                }
                // don't parse if it's not a known token
                if (formatTokenFunctions[token]) {
                    if (parsedInput) {
                        getParsingFlags(config).empty = false;
                    } else {
                        getParsingFlags(config).unusedTokens.push(token);
                    }
                    addTimeToArrayFromToken(token, parsedInput, config);
                } else if (config._strict && !parsedInput) {
                    getParsingFlags(config).unusedTokens.push(token);
                }
            }

            // add remaining unparsed input length to the string
            getParsingFlags(config).charsLeftOver =
                stringLength - totalParsedInputLength;
            if (string.length > 0) {
                getParsingFlags(config).unusedInput.push(string);
            }

            // clear _12h flag if hour is <= 12
            if (
                config._a[HOUR] <= 12 &&
                getParsingFlags(config).bigHour === true &&
                config._a[HOUR] > 0
            ) {
                getParsingFlags(config).bigHour = undefined;
            }

            getParsingFlags(config).parsedDateParts = config._a.slice(0);
            getParsingFlags(config).meridiem = config._meridiem;
            // handle meridiem
            config._a[HOUR] = meridiemFixWrap(
                config._locale,
                config._a[HOUR],
                config._meridiem
            );

            // handle era
            era = getParsingFlags(config).era;
            if (era !== null) {
                config._a[YEAR] = config._locale.erasConvertYear(era, config._a[YEAR]);
            }

            configFromArray(config);
            checkOverflow(config);
        }

        function meridiemFixWrap(locale, hour, meridiem) {
            var isPm;

            if (meridiem == null) {
                // nothing to do
                return hour;
            }
            if (locale.meridiemHour != null) {
                return locale.meridiemHour(hour, meridiem);
            } else if (locale.isPM != null) {
                // Fallback
                isPm = locale.isPM(meridiem);
                if (isPm && hour < 12) {
                    hour += 12;
                }
                if (!isPm && hour === 12) {
                    hour = 0;
                }
                return hour;
            } else {
                // this is not supposed to happen
                return hour;
            }
        }

        // date from string and array of format strings
        function configFromStringAndArray(config) {
            var tempConfig,
                bestMoment,
                scoreToBeat,
                i,
                currentScore,
                validFormatFound,
                bestFormatIsValid = false,
                configfLen = config._f.length;

            if (configfLen === 0) {
                getParsingFlags(config).invalidFormat = true;
                config._d = new Date(NaN);
                return;
            }

            for (i = 0; i < configfLen; i++) {
                currentScore = 0;
                validFormatFound = false;
                tempConfig = copyConfig({}, config);
                if (config._useUTC != null) {
                    tempConfig._useUTC = config._useUTC;
                }
                tempConfig._f = config._f[i];
                configFromStringAndFormat(tempConfig);

                if (isValid(tempConfig)) {
                    validFormatFound = true;
                }

                // if there is any input that was not parsed add a penalty for that format
                currentScore += getParsingFlags(tempConfig).charsLeftOver;

                //or tokens
                currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

                getParsingFlags(tempConfig).score = currentScore;

                if (!bestFormatIsValid) {
                    if (
                        scoreToBeat == null ||
                        currentScore < scoreToBeat ||
                        validFormatFound
                    ) {
                        scoreToBeat = currentScore;
                        bestMoment = tempConfig;
                        if (validFormatFound) {
                            bestFormatIsValid = true;
                        }
                    }
                } else {
                    if (currentScore < scoreToBeat) {
                        scoreToBeat = currentScore;
                        bestMoment = tempConfig;
                    }
                }
            }

            extend(config, bestMoment || tempConfig);
        }

        function configFromObject(config) {
            if (config._d) {
                return;
            }

            var i = normalizeObjectUnits(config._i),
                dayOrDate = i.day === undefined ? i.date : i.day;
            config._a = map(
                [i.year, i.month, dayOrDate, i.hour, i.minute, i.second, i.millisecond],
                function (obj) {
                    return obj && parseInt(obj, 10);
                }
            );

            configFromArray(config);
        }

        function createFromConfig(config) {
            var res = new Moment(checkOverflow(prepareConfig(config)));
            if (res._nextDay) {
                // Adding is smart enough around DST
                res.add(1, 'd');
                res._nextDay = undefined;
            }

            return res;
        }

        function prepareConfig(config) {
            var input = config._i,
                format = config._f;

            config._locale = config._locale || getLocale(config._l);

            if (input === null || (format === undefined && input === '')) {
                return createInvalid({ nullInput: true });
            }

            if (typeof input === 'string') {
                config._i = input = config._locale.preparse(input);
            }

            if (isMoment(input)) {
                return new Moment(checkOverflow(input));
            } else if (isDate(input)) {
                config._d = input;
            } else if (isArray(format)) {
                configFromStringAndArray(config);
            } else if (format) {
                configFromStringAndFormat(config);
            } else {
                configFromInput(config);
            }

            if (!isValid(config)) {
                config._d = null;
            }

            return config;
        }

        function configFromInput(config) {
            var input = config._i;
            if (isUndefined(input)) {
                config._d = new Date(hooks.now());
            } else if (isDate(input)) {
                config._d = new Date(input.valueOf());
            } else if (typeof input === 'string') {
                configFromString(config);
            } else if (isArray(input)) {
                config._a = map(input.slice(0), function (obj) {
                    return parseInt(obj, 10);
                });
                configFromArray(config);
            } else if (isObject(input)) {
                configFromObject(config);
            } else if (isNumber(input)) {
                // from milliseconds
                config._d = new Date(input);
            } else {
                hooks.createFromInputFallback(config);
            }
        }

        function createLocalOrUTC(input, format, locale, strict, isUTC) {
            var c = {};

            if (format === true || format === false) {
                strict = format;
                format = undefined;
            }

            if (locale === true || locale === false) {
                strict = locale;
                locale = undefined;
            }

            if (
                (isObject(input) && isObjectEmpty(input)) ||
                (isArray(input) && input.length === 0)
            ) {
                input = undefined;
            }
            // object construction must be done this way.
            // https://github.com/moment/moment/issues/1423
            c._isAMomentObject = true;
            c._useUTC = c._isUTC = isUTC;
            c._l = locale;
            c._i = input;
            c._f = format;
            c._strict = strict;

            return createFromConfig(c);
        }

        function createLocal(input, format, locale, strict) {
            return createLocalOrUTC(input, format, locale, strict, false);
        }

        var prototypeMin = deprecate(
                'moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/',
                function () {
                    var other = createLocal.apply(null, arguments);
                    if (this.isValid() && other.isValid()) {
                        return other < this ? this : other;
                    } else {
                        return createInvalid();
                    }
                }
            ),
            prototypeMax = deprecate(
                'moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/',
                function () {
                    var other = createLocal.apply(null, arguments);
                    if (this.isValid() && other.isValid()) {
                        return other > this ? this : other;
                    } else {
                        return createInvalid();
                    }
                }
            );

        // Pick a moment m from moments so that m[fn](other) is true for all
        // other. This relies on the function fn to be transitive.
        //
        // moments should either be an array of moment objects or an array, whose
        // first element is an array of moment objects.
        function pickBy(fn, moments) {
            var res, i;
            if (moments.length === 1 && isArray(moments[0])) {
                moments = moments[0];
            }
            if (!moments.length) {
                return createLocal();
            }
            res = moments[0];
            for (i = 1; i < moments.length; ++i) {
                if (!moments[i].isValid() || moments[i][fn](res)) {
                    res = moments[i];
                }
            }
            return res;
        }

        // TODO: Use [].sort instead?
        function min() {
            var args = [].slice.call(arguments, 0);

            return pickBy('isBefore', args);
        }

        function max() {
            var args = [].slice.call(arguments, 0);

            return pickBy('isAfter', args);
        }

        var now = function () {
            return Date.now ? Date.now() : +new Date();
        };

        var ordering = [
            'year',
            'quarter',
            'month',
            'week',
            'day',
            'hour',
            'minute',
            'second',
            'millisecond',
        ];

        function isDurationValid(m) {
            var key,
                unitHasDecimal = false,
                i,
                orderLen = ordering.length;
            for (key in m) {
                if (
                    hasOwnProp(m, key) &&
                    !(
                        indexOf.call(ordering, key) !== -1 &&
                        (m[key] == null || !isNaN(m[key]))
                    )
                ) {
                    return false;
                }
            }

            for (i = 0; i < orderLen; ++i) {
                if (m[ordering[i]]) {
                    if (unitHasDecimal) {
                        return false; // only allow non-integers for smallest unit
                    }
                    if (parseFloat(m[ordering[i]]) !== toInt(m[ordering[i]])) {
                        unitHasDecimal = true;
                    }
                }
            }

            return true;
        }

        function isValid$1() {
            return this._isValid;
        }

        function createInvalid$1() {
            return createDuration(NaN);
        }

        function Duration(duration) {
            var normalizedInput = normalizeObjectUnits(duration),
                years = normalizedInput.year || 0,
                quarters = normalizedInput.quarter || 0,
                months = normalizedInput.month || 0,
                weeks = normalizedInput.week || normalizedInput.isoWeek || 0,
                days = normalizedInput.day || 0,
                hours = normalizedInput.hour || 0,
                minutes = normalizedInput.minute || 0,
                seconds = normalizedInput.second || 0,
                milliseconds = normalizedInput.millisecond || 0;

            this._isValid = isDurationValid(normalizedInput);

            // representation for dateAddRemove
            this._milliseconds =
                +milliseconds +
                seconds * 1e3 + // 1000
                minutes * 6e4 + // 1000 * 60
                hours * 1000 * 60 * 60; //using 1000 * 60 * 60 instead of 36e5 to avoid floating point rounding errors https://github.com/moment/moment/issues/2978
            // Because of dateAddRemove treats 24 hours as different from a
            // day when working around DST, we need to store them separately
            this._days = +days + weeks * 7;
            // It is impossible to translate months into days without knowing
            // which months you are are talking about, so we have to store
            // it separately.
            this._months = +months + quarters * 3 + years * 12;

            this._data = {};

            this._locale = getLocale();

            this._bubble();
        }

        function isDuration(obj) {
            return obj instanceof Duration;
        }

        function absRound(number) {
            if (number < 0) {
                return Math.round(-1 * number) * -1;
            } else {
                return Math.round(number);
            }
        }

        // compare two arrays, return the number of differences
        function compareArrays(array1, array2, dontConvert) {
            var len = Math.min(array1.length, array2.length),
                lengthDiff = Math.abs(array1.length - array2.length),
                diffs = 0,
                i;
            for (i = 0; i < len; i++) {
                if (
                    (dontConvert && array1[i] !== array2[i]) ||
                    (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))
                ) {
                    diffs++;
                }
            }
            return diffs + lengthDiff;
        }

        // FORMATTING

        function offset(token, separator) {
            addFormatToken(token, 0, 0, function () {
                var offset = this.utcOffset(),
                    sign = '+';
                if (offset < 0) {
                    offset = -offset;
                    sign = '-';
                }
                return (
                    sign +
                    zeroFill(~~(offset / 60), 2) +
                    separator +
                    zeroFill(~~offset % 60, 2)
                );
            });
        }

        offset('Z', ':');
        offset('ZZ', '');

        // PARSING

        addRegexToken('Z', matchShortOffset);
        addRegexToken('ZZ', matchShortOffset);
        addParseToken(['Z', 'ZZ'], function (input, array, config) {
            config._useUTC = true;
            config._tzm = offsetFromString(matchShortOffset, input);
        });

        // HELPERS

        // timezone chunker
        // '+10:00' > ['10',  '00']
        // '-1530'  > ['-15', '30']
        var chunkOffset = /([\+\-]|\d\d)/gi;

        function offsetFromString(matcher, string) {
            var matches = (string || '').match(matcher),
                chunk,
                parts,
                minutes;

            if (matches === null) {
                return null;
            }

            chunk = matches[matches.length - 1] || [];
            parts = (chunk + '').match(chunkOffset) || ['-', 0, 0];
            minutes = +(parts[1] * 60) + toInt(parts[2]);

            return minutes === 0 ? 0 : parts[0] === '+' ? minutes : -minutes;
        }

        // Return a moment from input, that is local/utc/zone equivalent to model.
        function cloneWithOffset(input, model) {
            var res, diff;
            if (model._isUTC) {
                res = model.clone();
                diff =
                    (isMoment(input) || isDate(input)
                        ? input.valueOf()
                        : createLocal(input).valueOf()) - res.valueOf();
                // Use low-level api, because this fn is low-level api.
                res._d.setTime(res._d.valueOf() + diff);
                hooks.updateOffset(res, false);
                return res;
            } else {
                return createLocal(input).local();
            }
        }

        function getDateOffset(m) {
            // On Firefox.24 Date#getTimezoneOffset returns a floating point.
            // https://github.com/moment/moment/pull/1871
            return -Math.round(m._d.getTimezoneOffset());
        }

        // HOOKS

        // This function will be called whenever a moment is mutated.
        // It is intended to keep the offset in sync with the timezone.
        hooks.updateOffset = function () {};

        // MOMENTS

        // keepLocalTime = true means only change the timezone, without
        // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
        // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
        // +0200, so we adjust the time as needed, to be valid.
        //
        // Keeping the time actually adds/subtracts (one hour)
        // from the actual represented time. That is why we call updateOffset
        // a second time. In case it wants us to change the offset again
        // _changeInProgress == true case, then we have to adjust, because
        // there is no such time in the given timezone.
        function getSetOffset(input, keepLocalTime, keepMinutes) {
            var offset = this._offset || 0,
                localAdjust;
            if (!this.isValid()) {
                return input != null ? this : NaN;
            }
            if (input != null) {
                if (typeof input === 'string') {
                    input = offsetFromString(matchShortOffset, input);
                    if (input === null) {
                        return this;
                    }
                } else if (Math.abs(input) < 16 && !keepMinutes) {
                    input = input * 60;
                }
                if (!this._isUTC && keepLocalTime) {
                    localAdjust = getDateOffset(this);
                }
                this._offset = input;
                this._isUTC = true;
                if (localAdjust != null) {
                    this.add(localAdjust, 'm');
                }
                if (offset !== input) {
                    if (!keepLocalTime || this._changeInProgress) {
                        addSubtract(
                            this,
                            createDuration(input - offset, 'm'),
                            1,
                            false
                        );
                    } else if (!this._changeInProgress) {
                        this._changeInProgress = true;
                        hooks.updateOffset(this, true);
                        this._changeInProgress = null;
                    }
                }
                return this;
            } else {
                return this._isUTC ? offset : getDateOffset(this);
            }
        }

        function getSetZone(input, keepLocalTime) {
            if (input != null) {
                if (typeof input !== 'string') {
                    input = -input;
                }

                this.utcOffset(input, keepLocalTime);

                return this;
            } else {
                return -this.utcOffset();
            }
        }

        function setOffsetToUTC(keepLocalTime) {
            return this.utcOffset(0, keepLocalTime);
        }

        function setOffsetToLocal(keepLocalTime) {
            if (this._isUTC) {
                this.utcOffset(0, keepLocalTime);
                this._isUTC = false;

                if (keepLocalTime) {
                    this.subtract(getDateOffset(this), 'm');
                }
            }
            return this;
        }

        function setOffsetToParsedOffset() {
            if (this._tzm != null) {
                this.utcOffset(this._tzm, false, true);
            } else if (typeof this._i === 'string') {
                var tZone = offsetFromString(matchOffset, this._i);
                if (tZone != null) {
                    this.utcOffset(tZone);
                } else {
                    this.utcOffset(0, true);
                }
            }
            return this;
        }

        function hasAlignedHourOffset(input) {
            if (!this.isValid()) {
                return false;
            }
            input = input ? createLocal(input).utcOffset() : 0;

            return (this.utcOffset() - input) % 60 === 0;
        }

        function isDaylightSavingTime() {
            return (
                this.utcOffset() > this.clone().month(0).utcOffset() ||
                this.utcOffset() > this.clone().month(5).utcOffset()
            );
        }

        function isDaylightSavingTimeShifted() {
            if (!isUndefined(this._isDSTShifted)) {
                return this._isDSTShifted;
            }

            var c = {},
                other;

            copyConfig(c, this);
            c = prepareConfig(c);

            if (c._a) {
                other = c._isUTC ? createUTC(c._a) : createLocal(c._a);
                this._isDSTShifted =
                    this.isValid() && compareArrays(c._a, other.toArray()) > 0;
            } else {
                this._isDSTShifted = false;
            }

            return this._isDSTShifted;
        }

        function isLocal() {
            return this.isValid() ? !this._isUTC : false;
        }

        function isUtcOffset() {
            return this.isValid() ? this._isUTC : false;
        }

        function isUtc() {
            return this.isValid() ? this._isUTC && this._offset === 0 : false;
        }

        // ASP.NET json date format regex
        var aspNetRegex = /^(-|\+)?(?:(\d*)[. ])?(\d+):(\d+)(?::(\d+)(\.\d*)?)?$/,
            // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
            // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
            // and further modified to allow for strings containing both week and day
            isoRegex =
                /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;

        function createDuration(input, key) {
            var duration = input,
                // matching against regexp is expensive, do it on demand
                match = null,
                sign,
                ret,
                diffRes;

            if (isDuration(input)) {
                duration = {
                    ms: input._milliseconds,
                    d: input._days,
                    M: input._months,
                };
            } else if (isNumber(input) || !isNaN(+input)) {
                duration = {};
                if (key) {
                    duration[key] = +input;
                } else {
                    duration.milliseconds = +input;
                }
            } else if ((match = aspNetRegex.exec(input))) {
                sign = match[1] === '-' ? -1 : 1;
                duration = {
                    y: 0,
                    d: toInt(match[DATE]) * sign,
                    h: toInt(match[HOUR]) * sign,
                    m: toInt(match[MINUTE]) * sign,
                    s: toInt(match[SECOND]) * sign,
                    ms: toInt(absRound(match[MILLISECOND] * 1000)) * sign, // the millisecond decimal point is included in the match
                };
            } else if ((match = isoRegex.exec(input))) {
                sign = match[1] === '-' ? -1 : 1;
                duration = {
                    y: parseIso(match[2], sign),
                    M: parseIso(match[3], sign),
                    w: parseIso(match[4], sign),
                    d: parseIso(match[5], sign),
                    h: parseIso(match[6], sign),
                    m: parseIso(match[7], sign),
                    s: parseIso(match[8], sign),
                };
            } else if (duration == null) {
                // checks for null or undefined
                duration = {};
            } else if (
                typeof duration === 'object' &&
                ('from' in duration || 'to' in duration)
            ) {
                diffRes = momentsDifference(
                    createLocal(duration.from),
                    createLocal(duration.to)
                );

                duration = {};
                duration.ms = diffRes.milliseconds;
                duration.M = diffRes.months;
            }

            ret = new Duration(duration);

            if (isDuration(input) && hasOwnProp(input, '_locale')) {
                ret._locale = input._locale;
            }

            if (isDuration(input) && hasOwnProp(input, '_isValid')) {
                ret._isValid = input._isValid;
            }

            return ret;
        }

        createDuration.fn = Duration.prototype;
        createDuration.invalid = createInvalid$1;

        function parseIso(inp, sign) {
            // We'd normally use ~~inp for this, but unfortunately it also
            // converts floats to ints.
            // inp may be undefined, so careful calling replace on it.
            var res = inp && parseFloat(inp.replace(',', '.'));
            // apply sign while we're at it
            return (isNaN(res) ? 0 : res) * sign;
        }

        function positiveMomentsDifference(base, other) {
            var res = {};

            res.months =
                other.month() - base.month() + (other.year() - base.year()) * 12;
            if (base.clone().add(res.months, 'M').isAfter(other)) {
                --res.months;
            }

            res.milliseconds = +other - +base.clone().add(res.months, 'M');

            return res;
        }

        function momentsDifference(base, other) {
            var res;
            if (!(base.isValid() && other.isValid())) {
                return { milliseconds: 0, months: 0 };
            }

            other = cloneWithOffset(other, base);
            if (base.isBefore(other)) {
                res = positiveMomentsDifference(base, other);
            } else {
                res = positiveMomentsDifference(other, base);
                res.milliseconds = -res.milliseconds;
                res.months = -res.months;
            }

            return res;
        }

        // TODO: remove 'name' arg after deprecation is removed
        function createAdder(direction, name) {
            return function (val, period) {
                var dur, tmp;
                //invert the arguments, but complain about it
                if (period !== null && !isNaN(+period)) {
                    deprecateSimple(
                        name,
                        'moment().' +
                            name +
                            '(period, number) is deprecated. Please use moment().' +
                            name +
                            '(number, period). ' +
                            'See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info.'
                    );
                    tmp = val;
                    val = period;
                    period = tmp;
                }

                dur = createDuration(val, period);
                addSubtract(this, dur, direction);
                return this;
            };
        }

        function addSubtract(mom, duration, isAdding, updateOffset) {
            var milliseconds = duration._milliseconds,
                days = absRound(duration._days),
                months = absRound(duration._months);

            if (!mom.isValid()) {
                // No op
                return;
            }

            updateOffset = updateOffset == null ? true : updateOffset;

            if (months) {
                setMonth(mom, get(mom, 'Month') + months * isAdding);
            }
            if (days) {
                set$1(mom, 'Date', get(mom, 'Date') + days * isAdding);
            }
            if (milliseconds) {
                mom._d.setTime(mom._d.valueOf() + milliseconds * isAdding);
            }
            if (updateOffset) {
                hooks.updateOffset(mom, days || months);
            }
        }

        var add = createAdder(1, 'add'),
            subtract = createAdder(-1, 'subtract');

        function isString(input) {
            return typeof input === 'string' || input instanceof String;
        }

        // type MomentInput = Moment | Date | string | number | (number | string)[] | MomentInputObject | void; // null | undefined
        function isMomentInput(input) {
            return (
                isMoment(input) ||
                isDate(input) ||
                isString(input) ||
                isNumber(input) ||
                isNumberOrStringArray(input) ||
                isMomentInputObject(input) ||
                input === null ||
                input === undefined
            );
        }

        function isMomentInputObject(input) {
            var objectTest = isObject(input) && !isObjectEmpty(input),
                propertyTest = false,
                properties = [
                    'years',
                    'year',
                    'y',
                    'months',
                    'month',
                    'M',
                    'days',
                    'day',
                    'd',
                    'dates',
                    'date',
                    'D',
                    'hours',
                    'hour',
                    'h',
                    'minutes',
                    'minute',
                    'm',
                    'seconds',
                    'second',
                    's',
                    'milliseconds',
                    'millisecond',
                    'ms',
                ],
                i,
                property,
                propertyLen = properties.length;

            for (i = 0; i < propertyLen; i += 1) {
                property = properties[i];
                propertyTest = propertyTest || hasOwnProp(input, property);
            }

            return objectTest && propertyTest;
        }

        function isNumberOrStringArray(input) {
            var arrayTest = isArray(input),
                dataTypeTest = false;
            if (arrayTest) {
                dataTypeTest =
                    input.filter(function (item) {
                        return !isNumber(item) && isString(input);
                    }).length === 0;
            }
            return arrayTest && dataTypeTest;
        }

        function isCalendarSpec(input) {
            var objectTest = isObject(input) && !isObjectEmpty(input),
                propertyTest = false,
                properties = [
                    'sameDay',
                    'nextDay',
                    'lastDay',
                    'nextWeek',
                    'lastWeek',
                    'sameElse',
                ],
                i,
                property;

            for (i = 0; i < properties.length; i += 1) {
                property = properties[i];
                propertyTest = propertyTest || hasOwnProp(input, property);
            }

            return objectTest && propertyTest;
        }

        function getCalendarFormat(myMoment, now) {
            var diff = myMoment.diff(now, 'days', true);
            return diff < -6
                ? 'sameElse'
                : diff < -1
                ? 'lastWeek'
                : diff < 0
                ? 'lastDay'
                : diff < 1
                ? 'sameDay'
                : diff < 2
                ? 'nextDay'
                : diff < 7
                ? 'nextWeek'
                : 'sameElse';
        }

        function calendar$1(time, formats) {
            // Support for single parameter, formats only overload to the calendar function
            if (arguments.length === 1) {
                if (!arguments[0]) {
                    time = undefined;
                    formats = undefined;
                } else if (isMomentInput(arguments[0])) {
                    time = arguments[0];
                    formats = undefined;
                } else if (isCalendarSpec(arguments[0])) {
                    formats = arguments[0];
                    time = undefined;
                }
            }
            // We want to compare the start of today, vs this.
            // Getting start-of-today depends on whether we're local/utc/offset or not.
            var now = time || createLocal(),
                sod = cloneWithOffset(now, this).startOf('day'),
                format = hooks.calendarFormat(this, sod) || 'sameElse',
                output =
                    formats &&
                    (isFunction(formats[format])
                        ? formats[format].call(this, now)
                        : formats[format]);

            return this.format(
                output || this.localeData().calendar(format, this, createLocal(now))
            );
        }

        function clone() {
            return new Moment(this);
        }

        function isAfter(input, units) {
            var localInput = isMoment(input) ? input : createLocal(input);
            if (!(this.isValid() && localInput.isValid())) {
                return false;
            }
            units = normalizeUnits(units) || 'millisecond';
            if (units === 'millisecond') {
                return this.valueOf() > localInput.valueOf();
            } else {
                return localInput.valueOf() < this.clone().startOf(units).valueOf();
            }
        }

        function isBefore(input, units) {
            var localInput = isMoment(input) ? input : createLocal(input);
            if (!(this.isValid() && localInput.isValid())) {
                return false;
            }
            units = normalizeUnits(units) || 'millisecond';
            if (units === 'millisecond') {
                return this.valueOf() < localInput.valueOf();
            } else {
                return this.clone().endOf(units).valueOf() < localInput.valueOf();
            }
        }

        function isBetween(from, to, units, inclusivity) {
            var localFrom = isMoment(from) ? from : createLocal(from),
                localTo = isMoment(to) ? to : createLocal(to);
            if (!(this.isValid() && localFrom.isValid() && localTo.isValid())) {
                return false;
            }
            inclusivity = inclusivity || '()';
            return (
                (inclusivity[0] === '('
                    ? this.isAfter(localFrom, units)
                    : !this.isBefore(localFrom, units)) &&
                (inclusivity[1] === ')'
                    ? this.isBefore(localTo, units)
                    : !this.isAfter(localTo, units))
            );
        }

        function isSame(input, units) {
            var localInput = isMoment(input) ? input : createLocal(input),
                inputMs;
            if (!(this.isValid() && localInput.isValid())) {
                return false;
            }
            units = normalizeUnits(units) || 'millisecond';
            if (units === 'millisecond') {
                return this.valueOf() === localInput.valueOf();
            } else {
                inputMs = localInput.valueOf();
                return (
                    this.clone().startOf(units).valueOf() <= inputMs &&
                    inputMs <= this.clone().endOf(units).valueOf()
                );
            }
        }

        function isSameOrAfter(input, units) {
            return this.isSame(input, units) || this.isAfter(input, units);
        }

        function isSameOrBefore(input, units) {
            return this.isSame(input, units) || this.isBefore(input, units);
        }

        function diff(input, units, asFloat) {
            var that, zoneDelta, output;

            if (!this.isValid()) {
                return NaN;
            }

            that = cloneWithOffset(input, this);

            if (!that.isValid()) {
                return NaN;
            }

            zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4;

            units = normalizeUnits(units);

            switch (units) {
                case 'year':
                    output = monthDiff(this, that) / 12;
                    break;
                case 'month':
                    output = monthDiff(this, that);
                    break;
                case 'quarter':
                    output = monthDiff(this, that) / 3;
                    break;
                case 'second':
                    output = (this - that) / 1e3;
                    break; // 1000
                case 'minute':
                    output = (this - that) / 6e4;
                    break; // 1000 * 60
                case 'hour':
                    output = (this - that) / 36e5;
                    break; // 1000 * 60 * 60
                case 'day':
                    output = (this - that - zoneDelta) / 864e5;
                    break; // 1000 * 60 * 60 * 24, negate dst
                case 'week':
                    output = (this - that - zoneDelta) / 6048e5;
                    break; // 1000 * 60 * 60 * 24 * 7, negate dst
                default:
                    output = this - that;
            }

            return asFloat ? output : absFloor(output);
        }

        function monthDiff(a, b) {
            if (a.date() < b.date()) {
                // end-of-month calculations work correct when the start month has more
                // days than the end month.
                return -monthDiff(b, a);
            }
            // difference in months
            var wholeMonthDiff = (b.year() - a.year()) * 12 + (b.month() - a.month()),
                // b is in (anchor - 1 month, anchor + 1 month)
                anchor = a.clone().add(wholeMonthDiff, 'months'),
                anchor2,
                adjust;

            if (b - anchor < 0) {
                anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
                // linear across the month
                adjust = (b - anchor) / (anchor - anchor2);
            } else {
                anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
                // linear across the month
                adjust = (b - anchor) / (anchor2 - anchor);
            }

            //check for negative zero, return zero if negative zero
            return -(wholeMonthDiff + adjust) || 0;
        }

        hooks.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ';
        hooks.defaultFormatUtc = 'YYYY-MM-DDTHH:mm:ss[Z]';

        function toString() {
            return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
        }

        function toISOString(keepOffset) {
            if (!this.isValid()) {
                return null;
            }
            var utc = keepOffset !== true,
                m = utc ? this.clone().utc() : this;
            if (m.year() < 0 || m.year() > 9999) {
                return formatMoment(
                    m,
                    utc
                        ? 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]'
                        : 'YYYYYY-MM-DD[T]HH:mm:ss.SSSZ'
                );
            }
            if (isFunction(Date.prototype.toISOString)) {
                // native implementation is ~50x faster, use it when we can
                if (utc) {
                    return this.toDate().toISOString();
                } else {
                    return new Date(this.valueOf() + this.utcOffset() * 60 * 1000)
                        .toISOString()
                        .replace('Z', formatMoment(m, 'Z'));
                }
            }
            return formatMoment(
                m,
                utc ? 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYY-MM-DD[T]HH:mm:ss.SSSZ'
            );
        }

        /**
         * Return a human readable representation of a moment that can
         * also be evaluated to get a new moment which is the same
         *
         * @link https://nodejs.org/dist/latest/docs/api/util.html#util_custom_inspect_function_on_objects
         */
        function inspect() {
            if (!this.isValid()) {
                return 'moment.invalid(/* ' + this._i + ' */)';
            }
            var func = 'moment',
                zone = '',
                prefix,
                year,
                datetime,
                suffix;
            if (!this.isLocal()) {
                func = this.utcOffset() === 0 ? 'moment.utc' : 'moment.parseZone';
                zone = 'Z';
            }
            prefix = '[' + func + '("]';
            year = 0 <= this.year() && this.year() <= 9999 ? 'YYYY' : 'YYYYYY';
            datetime = '-MM-DD[T]HH:mm:ss.SSS';
            suffix = zone + '[")]';

            return this.format(prefix + year + datetime + suffix);
        }

        function format(inputString) {
            if (!inputString) {
                inputString = this.isUtc()
                    ? hooks.defaultFormatUtc
                    : hooks.defaultFormat;
            }
            var output = formatMoment(this, inputString);
            return this.localeData().postformat(output);
        }

        function from(time, withoutSuffix) {
            if (
                this.isValid() &&
                ((isMoment(time) && time.isValid()) || createLocal(time).isValid())
            ) {
                return createDuration({ to: this, from: time })
                    .locale(this.locale())
                    .humanize(!withoutSuffix);
            } else {
                return this.localeData().invalidDate();
            }
        }

        function fromNow(withoutSuffix) {
            return this.from(createLocal(), withoutSuffix);
        }

        function to(time, withoutSuffix) {
            if (
                this.isValid() &&
                ((isMoment(time) && time.isValid()) || createLocal(time).isValid())
            ) {
                return createDuration({ from: this, to: time })
                    .locale(this.locale())
                    .humanize(!withoutSuffix);
            } else {
                return this.localeData().invalidDate();
            }
        }

        function toNow(withoutSuffix) {
            return this.to(createLocal(), withoutSuffix);
        }

        // If passed a locale key, it will set the locale for this
        // instance.  Otherwise, it will return the locale configuration
        // variables for this instance.
        function locale(key) {
            var newLocaleData;

            if (key === undefined) {
                return this._locale._abbr;
            } else {
                newLocaleData = getLocale(key);
                if (newLocaleData != null) {
                    this._locale = newLocaleData;
                }
                return this;
            }
        }

        var lang = deprecate(
            'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
            function (key) {
                if (key === undefined) {
                    return this.localeData();
                } else {
                    return this.locale(key);
                }
            }
        );

        function localeData() {
            return this._locale;
        }

        var MS_PER_SECOND = 1000,
            MS_PER_MINUTE = 60 * MS_PER_SECOND,
            MS_PER_HOUR = 60 * MS_PER_MINUTE,
            MS_PER_400_YEARS = (365 * 400 + 97) * 24 * MS_PER_HOUR;

        // actual modulo - handles negative numbers (for dates before 1970):
        function mod$1(dividend, divisor) {
            return ((dividend % divisor) + divisor) % divisor;
        }

        function localStartOfDate(y, m, d) {
            // the date constructor remaps years 0-99 to 1900-1999
            if (y < 100 && y >= 0) {
                // preserve leap years using a full 400 year cycle, then reset
                return new Date(y + 400, m, d) - MS_PER_400_YEARS;
            } else {
                return new Date(y, m, d).valueOf();
            }
        }

        function utcStartOfDate(y, m, d) {
            // Date.UTC remaps years 0-99 to 1900-1999
            if (y < 100 && y >= 0) {
                // preserve leap years using a full 400 year cycle, then reset
                return Date.UTC(y + 400, m, d) - MS_PER_400_YEARS;
            } else {
                return Date.UTC(y, m, d);
            }
        }

        function startOf(units) {
            var time, startOfDate;
            units = normalizeUnits(units);
            if (units === undefined || units === 'millisecond' || !this.isValid()) {
                return this;
            }

            startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

            switch (units) {
                case 'year':
                    time = startOfDate(this.year(), 0, 1);
                    break;
                case 'quarter':
                    time = startOfDate(
                        this.year(),
                        this.month() - (this.month() % 3),
                        1
                    );
                    break;
                case 'month':
                    time = startOfDate(this.year(), this.month(), 1);
                    break;
                case 'week':
                    time = startOfDate(
                        this.year(),
                        this.month(),
                        this.date() - this.weekday()
                    );
                    break;
                case 'isoWeek':
                    time = startOfDate(
                        this.year(),
                        this.month(),
                        this.date() - (this.isoWeekday() - 1)
                    );
                    break;
                case 'day':
                case 'date':
                    time = startOfDate(this.year(), this.month(), this.date());
                    break;
                case 'hour':
                    time = this._d.valueOf();
                    time -= mod$1(
                        time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE),
                        MS_PER_HOUR
                    );
                    break;
                case 'minute':
                    time = this._d.valueOf();
                    time -= mod$1(time, MS_PER_MINUTE);
                    break;
                case 'second':
                    time = this._d.valueOf();
                    time -= mod$1(time, MS_PER_SECOND);
                    break;
            }

            this._d.setTime(time);
            hooks.updateOffset(this, true);
            return this;
        }

        function endOf(units) {
            var time, startOfDate;
            units = normalizeUnits(units);
            if (units === undefined || units === 'millisecond' || !this.isValid()) {
                return this;
            }

            startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

            switch (units) {
                case 'year':
                    time = startOfDate(this.year() + 1, 0, 1) - 1;
                    break;
                case 'quarter':
                    time =
                        startOfDate(
                            this.year(),
                            this.month() - (this.month() % 3) + 3,
                            1
                        ) - 1;
                    break;
                case 'month':
                    time = startOfDate(this.year(), this.month() + 1, 1) - 1;
                    break;
                case 'week':
                    time =
                        startOfDate(
                            this.year(),
                            this.month(),
                            this.date() - this.weekday() + 7
                        ) - 1;
                    break;
                case 'isoWeek':
                    time =
                        startOfDate(
                            this.year(),
                            this.month(),
                            this.date() - (this.isoWeekday() - 1) + 7
                        ) - 1;
                    break;
                case 'day':
                case 'date':
                    time = startOfDate(this.year(), this.month(), this.date() + 1) - 1;
                    break;
                case 'hour':
                    time = this._d.valueOf();
                    time +=
                        MS_PER_HOUR -
                        mod$1(
                            time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE),
                            MS_PER_HOUR
                        ) -
                        1;
                    break;
                case 'minute':
                    time = this._d.valueOf();
                    time += MS_PER_MINUTE - mod$1(time, MS_PER_MINUTE) - 1;
                    break;
                case 'second':
                    time = this._d.valueOf();
                    time += MS_PER_SECOND - mod$1(time, MS_PER_SECOND) - 1;
                    break;
            }

            this._d.setTime(time);
            hooks.updateOffset(this, true);
            return this;
        }

        function valueOf() {
            return this._d.valueOf() - (this._offset || 0) * 60000;
        }

        function unix() {
            return Math.floor(this.valueOf() / 1000);
        }

        function toDate() {
            return new Date(this.valueOf());
        }

        function toArray() {
            var m = this;
            return [
                m.year(),
                m.month(),
                m.date(),
                m.hour(),
                m.minute(),
                m.second(),
                m.millisecond(),
            ];
        }

        function toObject() {
            var m = this;
            return {
                years: m.year(),
                months: m.month(),
                date: m.date(),
                hours: m.hours(),
                minutes: m.minutes(),
                seconds: m.seconds(),
                milliseconds: m.milliseconds(),
            };
        }

        function toJSON() {
            // new Date(NaN).toJSON() === null
            return this.isValid() ? this.toISOString() : null;
        }

        function isValid$2() {
            return isValid(this);
        }

        function parsingFlags() {
            return extend({}, getParsingFlags(this));
        }

        function invalidAt() {
            return getParsingFlags(this).overflow;
        }

        function creationData() {
            return {
                input: this._i,
                format: this._f,
                locale: this._locale,
                isUTC: this._isUTC,
                strict: this._strict,
            };
        }

        addFormatToken('N', 0, 0, 'eraAbbr');
        addFormatToken('NN', 0, 0, 'eraAbbr');
        addFormatToken('NNN', 0, 0, 'eraAbbr');
        addFormatToken('NNNN', 0, 0, 'eraName');
        addFormatToken('NNNNN', 0, 0, 'eraNarrow');

        addFormatToken('y', ['y', 1], 'yo', 'eraYear');
        addFormatToken('y', ['yy', 2], 0, 'eraYear');
        addFormatToken('y', ['yyy', 3], 0, 'eraYear');
        addFormatToken('y', ['yyyy', 4], 0, 'eraYear');

        addRegexToken('N', matchEraAbbr);
        addRegexToken('NN', matchEraAbbr);
        addRegexToken('NNN', matchEraAbbr);
        addRegexToken('NNNN', matchEraName);
        addRegexToken('NNNNN', matchEraNarrow);

        addParseToken(
            ['N', 'NN', 'NNN', 'NNNN', 'NNNNN'],
            function (input, array, config, token) {
                var era = config._locale.erasParse(input, token, config._strict);
                if (era) {
                    getParsingFlags(config).era = era;
                } else {
                    getParsingFlags(config).invalidEra = input;
                }
            }
        );

        addRegexToken('y', matchUnsigned);
        addRegexToken('yy', matchUnsigned);
        addRegexToken('yyy', matchUnsigned);
        addRegexToken('yyyy', matchUnsigned);
        addRegexToken('yo', matchEraYearOrdinal);

        addParseToken(['y', 'yy', 'yyy', 'yyyy'], YEAR);
        addParseToken(['yo'], function (input, array, config, token) {
            var match;
            if (config._locale._eraYearOrdinalRegex) {
                match = input.match(config._locale._eraYearOrdinalRegex);
            }

            if (config._locale.eraYearOrdinalParse) {
                array[YEAR] = config._locale.eraYearOrdinalParse(input, match);
            } else {
                array[YEAR] = parseInt(input, 10);
            }
        });

        function localeEras(m, format) {
            var i,
                l,
                date,
                eras = this._eras || getLocale('en')._eras;
            for (i = 0, l = eras.length; i < l; ++i) {
                switch (typeof eras[i].since) {
                    case 'string':
                        // truncate time
                        date = hooks(eras[i].since).startOf('day');
                        eras[i].since = date.valueOf();
                        break;
                }

                switch (typeof eras[i].until) {
                    case 'undefined':
                        eras[i].until = +Infinity;
                        break;
                    case 'string':
                        // truncate time
                        date = hooks(eras[i].until).startOf('day').valueOf();
                        eras[i].until = date.valueOf();
                        break;
                }
            }
            return eras;
        }

        function localeErasParse(eraName, format, strict) {
            var i,
                l,
                eras = this.eras(),
                name,
                abbr,
                narrow;
            eraName = eraName.toUpperCase();

            for (i = 0, l = eras.length; i < l; ++i) {
                name = eras[i].name.toUpperCase();
                abbr = eras[i].abbr.toUpperCase();
                narrow = eras[i].narrow.toUpperCase();

                if (strict) {
                    switch (format) {
                        case 'N':
                        case 'NN':
                        case 'NNN':
                            if (abbr === eraName) {
                                return eras[i];
                            }
                            break;

                        case 'NNNN':
                            if (name === eraName) {
                                return eras[i];
                            }
                            break;

                        case 'NNNNN':
                            if (narrow === eraName) {
                                return eras[i];
                            }
                            break;
                    }
                } else if ([name, abbr, narrow].indexOf(eraName) >= 0) {
                    return eras[i];
                }
            }
        }

        function localeErasConvertYear(era, year) {
            var dir = era.since <= era.until ? +1 : -1;
            if (year === undefined) {
                return hooks(era.since).year();
            } else {
                return hooks(era.since).year() + (year - era.offset) * dir;
            }
        }

        function getEraName() {
            var i,
                l,
                val,
                eras = this.localeData().eras();
            for (i = 0, l = eras.length; i < l; ++i) {
                // truncate time
                val = this.clone().startOf('day').valueOf();

                if (eras[i].since <= val && val <= eras[i].until) {
                    return eras[i].name;
                }
                if (eras[i].until <= val && val <= eras[i].since) {
                    return eras[i].name;
                }
            }

            return '';
        }

        function getEraNarrow() {
            var i,
                l,
                val,
                eras = this.localeData().eras();
            for (i = 0, l = eras.length; i < l; ++i) {
                // truncate time
                val = this.clone().startOf('day').valueOf();

                if (eras[i].since <= val && val <= eras[i].until) {
                    return eras[i].narrow;
                }
                if (eras[i].until <= val && val <= eras[i].since) {
                    return eras[i].narrow;
                }
            }

            return '';
        }

        function getEraAbbr() {
            var i,
                l,
                val,
                eras = this.localeData().eras();
            for (i = 0, l = eras.length; i < l; ++i) {
                // truncate time
                val = this.clone().startOf('day').valueOf();

                if (eras[i].since <= val && val <= eras[i].until) {
                    return eras[i].abbr;
                }
                if (eras[i].until <= val && val <= eras[i].since) {
                    return eras[i].abbr;
                }
            }

            return '';
        }

        function getEraYear() {
            var i,
                l,
                dir,
                val,
                eras = this.localeData().eras();
            for (i = 0, l = eras.length; i < l; ++i) {
                dir = eras[i].since <= eras[i].until ? +1 : -1;

                // truncate time
                val = this.clone().startOf('day').valueOf();

                if (
                    (eras[i].since <= val && val <= eras[i].until) ||
                    (eras[i].until <= val && val <= eras[i].since)
                ) {
                    return (
                        (this.year() - hooks(eras[i].since).year()) * dir +
                        eras[i].offset
                    );
                }
            }

            return this.year();
        }

        function erasNameRegex(isStrict) {
            if (!hasOwnProp(this, '_erasNameRegex')) {
                computeErasParse.call(this);
            }
            return isStrict ? this._erasNameRegex : this._erasRegex;
        }

        function erasAbbrRegex(isStrict) {
            if (!hasOwnProp(this, '_erasAbbrRegex')) {
                computeErasParse.call(this);
            }
            return isStrict ? this._erasAbbrRegex : this._erasRegex;
        }

        function erasNarrowRegex(isStrict) {
            if (!hasOwnProp(this, '_erasNarrowRegex')) {
                computeErasParse.call(this);
            }
            return isStrict ? this._erasNarrowRegex : this._erasRegex;
        }

        function matchEraAbbr(isStrict, locale) {
            return locale.erasAbbrRegex(isStrict);
        }

        function matchEraName(isStrict, locale) {
            return locale.erasNameRegex(isStrict);
        }

        function matchEraNarrow(isStrict, locale) {
            return locale.erasNarrowRegex(isStrict);
        }

        function matchEraYearOrdinal(isStrict, locale) {
            return locale._eraYearOrdinalRegex || matchUnsigned;
        }

        function computeErasParse() {
            var abbrPieces = [],
                namePieces = [],
                narrowPieces = [],
                mixedPieces = [],
                i,
                l,
                eras = this.eras();

            for (i = 0, l = eras.length; i < l; ++i) {
                namePieces.push(regexEscape(eras[i].name));
                abbrPieces.push(regexEscape(eras[i].abbr));
                narrowPieces.push(regexEscape(eras[i].narrow));

                mixedPieces.push(regexEscape(eras[i].name));
                mixedPieces.push(regexEscape(eras[i].abbr));
                mixedPieces.push(regexEscape(eras[i].narrow));
            }

            this._erasRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
            this._erasNameRegex = new RegExp('^(' + namePieces.join('|') + ')', 'i');
            this._erasAbbrRegex = new RegExp('^(' + abbrPieces.join('|') + ')', 'i');
            this._erasNarrowRegex = new RegExp(
                '^(' + narrowPieces.join('|') + ')',
                'i'
            );
        }

        // FORMATTING

        addFormatToken(0, ['gg', 2], 0, function () {
            return this.weekYear() % 100;
        });

        addFormatToken(0, ['GG', 2], 0, function () {
            return this.isoWeekYear() % 100;
        });

        function addWeekYearFormatToken(token, getter) {
            addFormatToken(0, [token, token.length], 0, getter);
        }

        addWeekYearFormatToken('gggg', 'weekYear');
        addWeekYearFormatToken('ggggg', 'weekYear');
        addWeekYearFormatToken('GGGG', 'isoWeekYear');
        addWeekYearFormatToken('GGGGG', 'isoWeekYear');

        // ALIASES

        addUnitAlias('weekYear', 'gg');
        addUnitAlias('isoWeekYear', 'GG');

        // PRIORITY

        addUnitPriority('weekYear', 1);
        addUnitPriority('isoWeekYear', 1);

        // PARSING

        addRegexToken('G', matchSigned);
        addRegexToken('g', matchSigned);
        addRegexToken('GG', match1to2, match2);
        addRegexToken('gg', match1to2, match2);
        addRegexToken('GGGG', match1to4, match4);
        addRegexToken('gggg', match1to4, match4);
        addRegexToken('GGGGG', match1to6, match6);
        addRegexToken('ggggg', match1to6, match6);

        addWeekParseToken(
            ['gggg', 'ggggg', 'GGGG', 'GGGGG'],
            function (input, week, config, token) {
                week[token.substr(0, 2)] = toInt(input);
            }
        );

        addWeekParseToken(['gg', 'GG'], function (input, week, config, token) {
            week[token] = hooks.parseTwoDigitYear(input);
        });

        // MOMENTS

        function getSetWeekYear(input) {
            return getSetWeekYearHelper.call(
                this,
                input,
                this.week(),
                this.weekday(),
                this.localeData()._week.dow,
                this.localeData()._week.doy
            );
        }

        function getSetISOWeekYear(input) {
            return getSetWeekYearHelper.call(
                this,
                input,
                this.isoWeek(),
                this.isoWeekday(),
                1,
                4
            );
        }

        function getISOWeeksInYear() {
            return weeksInYear(this.year(), 1, 4);
        }

        function getISOWeeksInISOWeekYear() {
            return weeksInYear(this.isoWeekYear(), 1, 4);
        }

        function getWeeksInYear() {
            var weekInfo = this.localeData()._week;
            return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
        }

        function getWeeksInWeekYear() {
            var weekInfo = this.localeData()._week;
            return weeksInYear(this.weekYear(), weekInfo.dow, weekInfo.doy);
        }

        function getSetWeekYearHelper(input, week, weekday, dow, doy) {
            var weeksTarget;
            if (input == null) {
                return weekOfYear(this, dow, doy).year;
            } else {
                weeksTarget = weeksInYear(input, dow, doy);
                if (week > weeksTarget) {
                    week = weeksTarget;
                }
                return setWeekAll.call(this, input, week, weekday, dow, doy);
            }
        }

        function setWeekAll(weekYear, week, weekday, dow, doy) {
            var dayOfYearData = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy),
                date = createUTCDate(dayOfYearData.year, 0, dayOfYearData.dayOfYear);

            this.year(date.getUTCFullYear());
            this.month(date.getUTCMonth());
            this.date(date.getUTCDate());
            return this;
        }

        // FORMATTING

        addFormatToken('Q', 0, 'Qo', 'quarter');

        // ALIASES

        addUnitAlias('quarter', 'Q');

        // PRIORITY

        addUnitPriority('quarter', 7);

        // PARSING

        addRegexToken('Q', match1);
        addParseToken('Q', function (input, array) {
            array[MONTH] = (toInt(input) - 1) * 3;
        });

        // MOMENTS

        function getSetQuarter(input) {
            return input == null
                ? Math.ceil((this.month() + 1) / 3)
                : this.month((input - 1) * 3 + (this.month() % 3));
        }

        // FORMATTING

        addFormatToken('D', ['DD', 2], 'Do', 'date');

        // ALIASES

        addUnitAlias('date', 'D');

        // PRIORITY
        addUnitPriority('date', 9);

        // PARSING

        addRegexToken('D', match1to2);
        addRegexToken('DD', match1to2, match2);
        addRegexToken('Do', function (isStrict, locale) {
            // TODO: Remove "ordinalParse" fallback in next major release.
            return isStrict
                ? locale._dayOfMonthOrdinalParse || locale._ordinalParse
                : locale._dayOfMonthOrdinalParseLenient;
        });

        addParseToken(['D', 'DD'], DATE);
        addParseToken('Do', function (input, array) {
            array[DATE] = toInt(input.match(match1to2)[0]);
        });

        // MOMENTS

        var getSetDayOfMonth = makeGetSet('Date', true);

        // FORMATTING

        addFormatToken('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear');

        // ALIASES

        addUnitAlias('dayOfYear', 'DDD');

        // PRIORITY
        addUnitPriority('dayOfYear', 4);

        // PARSING

        addRegexToken('DDD', match1to3);
        addRegexToken('DDDD', match3);
        addParseToken(['DDD', 'DDDD'], function (input, array, config) {
            config._dayOfYear = toInt(input);
        });

        // HELPERS

        // MOMENTS

        function getSetDayOfYear(input) {
            var dayOfYear =
                Math.round(
                    (this.clone().startOf('day') - this.clone().startOf('year')) / 864e5
                ) + 1;
            return input == null ? dayOfYear : this.add(input - dayOfYear, 'd');
        }

        // FORMATTING

        addFormatToken('m', ['mm', 2], 0, 'minute');

        // ALIASES

        addUnitAlias('minute', 'm');

        // PRIORITY

        addUnitPriority('minute', 14);

        // PARSING

        addRegexToken('m', match1to2);
        addRegexToken('mm', match1to2, match2);
        addParseToken(['m', 'mm'], MINUTE);

        // MOMENTS

        var getSetMinute = makeGetSet('Minutes', false);

        // FORMATTING

        addFormatToken('s', ['ss', 2], 0, 'second');

        // ALIASES

        addUnitAlias('second', 's');

        // PRIORITY

        addUnitPriority('second', 15);

        // PARSING

        addRegexToken('s', match1to2);
        addRegexToken('ss', match1to2, match2);
        addParseToken(['s', 'ss'], SECOND);

        // MOMENTS

        var getSetSecond = makeGetSet('Seconds', false);

        // FORMATTING

        addFormatToken('S', 0, 0, function () {
            return ~~(this.millisecond() / 100);
        });

        addFormatToken(0, ['SS', 2], 0, function () {
            return ~~(this.millisecond() / 10);
        });

        addFormatToken(0, ['SSS', 3], 0, 'millisecond');
        addFormatToken(0, ['SSSS', 4], 0, function () {
            return this.millisecond() * 10;
        });
        addFormatToken(0, ['SSSSS', 5], 0, function () {
            return this.millisecond() * 100;
        });
        addFormatToken(0, ['SSSSSS', 6], 0, function () {
            return this.millisecond() * 1000;
        });
        addFormatToken(0, ['SSSSSSS', 7], 0, function () {
            return this.millisecond() * 10000;
        });
        addFormatToken(0, ['SSSSSSSS', 8], 0, function () {
            return this.millisecond() * 100000;
        });
        addFormatToken(0, ['SSSSSSSSS', 9], 0, function () {
            return this.millisecond() * 1000000;
        });

        // ALIASES

        addUnitAlias('millisecond', 'ms');

        // PRIORITY

        addUnitPriority('millisecond', 16);

        // PARSING

        addRegexToken('S', match1to3, match1);
        addRegexToken('SS', match1to3, match2);
        addRegexToken('SSS', match1to3, match3);

        var token, getSetMillisecond;
        for (token = 'SSSS'; token.length <= 9; token += 'S') {
            addRegexToken(token, matchUnsigned);
        }

        function parseMs(input, array) {
            array[MILLISECOND] = toInt(('0.' + input) * 1000);
        }

        for (token = 'S'; token.length <= 9; token += 'S') {
            addParseToken(token, parseMs);
        }

        getSetMillisecond = makeGetSet('Milliseconds', false);

        // FORMATTING

        addFormatToken('z', 0, 0, 'zoneAbbr');
        addFormatToken('zz', 0, 0, 'zoneName');

        // MOMENTS

        function getZoneAbbr() {
            return this._isUTC ? 'UTC' : '';
        }

        function getZoneName() {
            return this._isUTC ? 'Coordinated Universal Time' : '';
        }

        var proto = Moment.prototype;

        proto.add = add;
        proto.calendar = calendar$1;
        proto.clone = clone;
        proto.diff = diff;
        proto.endOf = endOf;
        proto.format = format;
        proto.from = from;
        proto.fromNow = fromNow;
        proto.to = to;
        proto.toNow = toNow;
        proto.get = stringGet;
        proto.invalidAt = invalidAt;
        proto.isAfter = isAfter;
        proto.isBefore = isBefore;
        proto.isBetween = isBetween;
        proto.isSame = isSame;
        proto.isSameOrAfter = isSameOrAfter;
        proto.isSameOrBefore = isSameOrBefore;
        proto.isValid = isValid$2;
        proto.lang = lang;
        proto.locale = locale;
        proto.localeData = localeData;
        proto.max = prototypeMax;
        proto.min = prototypeMin;
        proto.parsingFlags = parsingFlags;
        proto.set = stringSet;
        proto.startOf = startOf;
        proto.subtract = subtract;
        proto.toArray = toArray;
        proto.toObject = toObject;
        proto.toDate = toDate;
        proto.toISOString = toISOString;
        proto.inspect = inspect;
        if (typeof Symbol !== 'undefined' && Symbol.for != null) {
            proto[Symbol.for('nodejs.util.inspect.custom')] = function () {
                return 'Moment<' + this.format() + '>';
            };
        }
        proto.toJSON = toJSON;
        proto.toString = toString;
        proto.unix = unix;
        proto.valueOf = valueOf;
        proto.creationData = creationData;
        proto.eraName = getEraName;
        proto.eraNarrow = getEraNarrow;
        proto.eraAbbr = getEraAbbr;
        proto.eraYear = getEraYear;
        proto.year = getSetYear;
        proto.isLeapYear = getIsLeapYear;
        proto.weekYear = getSetWeekYear;
        proto.isoWeekYear = getSetISOWeekYear;
        proto.quarter = proto.quarters = getSetQuarter;
        proto.month = getSetMonth;
        proto.daysInMonth = getDaysInMonth;
        proto.week = proto.weeks = getSetWeek;
        proto.isoWeek = proto.isoWeeks = getSetISOWeek;
        proto.weeksInYear = getWeeksInYear;
        proto.weeksInWeekYear = getWeeksInWeekYear;
        proto.isoWeeksInYear = getISOWeeksInYear;
        proto.isoWeeksInISOWeekYear = getISOWeeksInISOWeekYear;
        proto.date = getSetDayOfMonth;
        proto.day = proto.days = getSetDayOfWeek;
        proto.weekday = getSetLocaleDayOfWeek;
        proto.isoWeekday = getSetISODayOfWeek;
        proto.dayOfYear = getSetDayOfYear;
        proto.hour = proto.hours = getSetHour;
        proto.minute = proto.minutes = getSetMinute;
        proto.second = proto.seconds = getSetSecond;
        proto.millisecond = proto.milliseconds = getSetMillisecond;
        proto.utcOffset = getSetOffset;
        proto.utc = setOffsetToUTC;
        proto.local = setOffsetToLocal;
        proto.parseZone = setOffsetToParsedOffset;
        proto.hasAlignedHourOffset = hasAlignedHourOffset;
        proto.isDST = isDaylightSavingTime;
        proto.isLocal = isLocal;
        proto.isUtcOffset = isUtcOffset;
        proto.isUtc = isUtc;
        proto.isUTC = isUtc;
        proto.zoneAbbr = getZoneAbbr;
        proto.zoneName = getZoneName;
        proto.dates = deprecate(
            'dates accessor is deprecated. Use date instead.',
            getSetDayOfMonth
        );
        proto.months = deprecate(
            'months accessor is deprecated. Use month instead',
            getSetMonth
        );
        proto.years = deprecate(
            'years accessor is deprecated. Use year instead',
            getSetYear
        );
        proto.zone = deprecate(
            'moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/',
            getSetZone
        );
        proto.isDSTShifted = deprecate(
            'isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information',
            isDaylightSavingTimeShifted
        );

        function createUnix(input) {
            return createLocal(input * 1000);
        }

        function createInZone() {
            return createLocal.apply(null, arguments).parseZone();
        }

        function preParsePostFormat(string) {
            return string;
        }

        var proto$1 = Locale.prototype;

        proto$1.calendar = calendar;
        proto$1.longDateFormat = longDateFormat;
        proto$1.invalidDate = invalidDate;
        proto$1.ordinal = ordinal;
        proto$1.preparse = preParsePostFormat;
        proto$1.postformat = preParsePostFormat;
        proto$1.relativeTime = relativeTime;
        proto$1.pastFuture = pastFuture;
        proto$1.set = set;
        proto$1.eras = localeEras;
        proto$1.erasParse = localeErasParse;
        proto$1.erasConvertYear = localeErasConvertYear;
        proto$1.erasAbbrRegex = erasAbbrRegex;
        proto$1.erasNameRegex = erasNameRegex;
        proto$1.erasNarrowRegex = erasNarrowRegex;

        proto$1.months = localeMonths;
        proto$1.monthsShort = localeMonthsShort;
        proto$1.monthsParse = localeMonthsParse;
        proto$1.monthsRegex = monthsRegex;
        proto$1.monthsShortRegex = monthsShortRegex;
        proto$1.week = localeWeek;
        proto$1.firstDayOfYear = localeFirstDayOfYear;
        proto$1.firstDayOfWeek = localeFirstDayOfWeek;

        proto$1.weekdays = localeWeekdays;
        proto$1.weekdaysMin = localeWeekdaysMin;
        proto$1.weekdaysShort = localeWeekdaysShort;
        proto$1.weekdaysParse = localeWeekdaysParse;

        proto$1.weekdaysRegex = weekdaysRegex;
        proto$1.weekdaysShortRegex = weekdaysShortRegex;
        proto$1.weekdaysMinRegex = weekdaysMinRegex;

        proto$1.isPM = localeIsPM;
        proto$1.meridiem = localeMeridiem;

        function get$1(format, index, field, setter) {
            var locale = getLocale(),
                utc = createUTC().set(setter, index);
            return locale[field](utc, format);
        }

        function listMonthsImpl(format, index, field) {
            if (isNumber(format)) {
                index = format;
                format = undefined;
            }

            format = format || '';

            if (index != null) {
                return get$1(format, index, field, 'month');
            }

            var i,
                out = [];
            for (i = 0; i < 12; i++) {
                out[i] = get$1(format, i, field, 'month');
            }
            return out;
        }

        // ()
        // (5)
        // (fmt, 5)
        // (fmt)
        // (true)
        // (true, 5)
        // (true, fmt, 5)
        // (true, fmt)
        function listWeekdaysImpl(localeSorted, format, index, field) {
            if (typeof localeSorted === 'boolean') {
                if (isNumber(format)) {
                    index = format;
                    format = undefined;
                }

                format = format || '';
            } else {
                format = localeSorted;
                index = format;
                localeSorted = false;

                if (isNumber(format)) {
                    index = format;
                    format = undefined;
                }

                format = format || '';
            }

            var locale = getLocale(),
                shift = localeSorted ? locale._week.dow : 0,
                i,
                out = [];

            if (index != null) {
                return get$1(format, (index + shift) % 7, field, 'day');
            }

            for (i = 0; i < 7; i++) {
                out[i] = get$1(format, (i + shift) % 7, field, 'day');
            }
            return out;
        }

        function listMonths(format, index) {
            return listMonthsImpl(format, index, 'months');
        }

        function listMonthsShort(format, index) {
            return listMonthsImpl(format, index, 'monthsShort');
        }

        function listWeekdays(localeSorted, format, index) {
            return listWeekdaysImpl(localeSorted, format, index, 'weekdays');
        }

        function listWeekdaysShort(localeSorted, format, index) {
            return listWeekdaysImpl(localeSorted, format, index, 'weekdaysShort');
        }

        function listWeekdaysMin(localeSorted, format, index) {
            return listWeekdaysImpl(localeSorted, format, index, 'weekdaysMin');
        }

        getSetGlobalLocale('en', {
            eras: [
                {
                    since: '0001-01-01',
                    until: +Infinity,
                    offset: 1,
                    name: 'Anno Domini',
                    narrow: 'AD',
                    abbr: 'AD',
                },
                {
                    since: '0000-12-31',
                    until: -Infinity,
                    offset: 1,
                    name: 'Before Christ',
                    narrow: 'BC',
                    abbr: 'BC',
                },
            ],
            dayOfMonthOrdinalParse: /\d{1,2}(th|st|nd|rd)/,
            ordinal: function (number) {
                var b = number % 10,
                    output =
                        toInt((number % 100) / 10) === 1
                            ? 'th'
                            : b === 1
                            ? 'st'
                            : b === 2
                            ? 'nd'
                            : b === 3
                            ? 'rd'
                            : 'th';
                return number + output;
            },
        });

        // Side effect imports

        hooks.lang = deprecate(
            'moment.lang is deprecated. Use moment.locale instead.',
            getSetGlobalLocale
        );
        hooks.langData = deprecate(
            'moment.langData is deprecated. Use moment.localeData instead.',
            getLocale
        );

        var mathAbs = Math.abs;

        function abs() {
            var data = this._data;

            this._milliseconds = mathAbs(this._milliseconds);
            this._days = mathAbs(this._days);
            this._months = mathAbs(this._months);

            data.milliseconds = mathAbs(data.milliseconds);
            data.seconds = mathAbs(data.seconds);
            data.minutes = mathAbs(data.minutes);
            data.hours = mathAbs(data.hours);
            data.months = mathAbs(data.months);
            data.years = mathAbs(data.years);

            return this;
        }

        function addSubtract$1(duration, input, value, direction) {
            var other = createDuration(input, value);

            duration._milliseconds += direction * other._milliseconds;
            duration._days += direction * other._days;
            duration._months += direction * other._months;

            return duration._bubble();
        }

        // supports only 2.0-style add(1, 's') or add(duration)
        function add$1(input, value) {
            return addSubtract$1(this, input, value, 1);
        }

        // supports only 2.0-style subtract(1, 's') or subtract(duration)
        function subtract$1(input, value) {
            return addSubtract$1(this, input, value, -1);
        }

        function absCeil(number) {
            if (number < 0) {
                return Math.floor(number);
            } else {
                return Math.ceil(number);
            }
        }

        function bubble() {
            var milliseconds = this._milliseconds,
                days = this._days,
                months = this._months,
                data = this._data,
                seconds,
                minutes,
                hours,
                years,
                monthsFromDays;

            // if we have a mix of positive and negative values, bubble down first
            // check: https://github.com/moment/moment/issues/2166
            if (
                !(
                    (milliseconds >= 0 && days >= 0 && months >= 0) ||
                    (milliseconds <= 0 && days <= 0 && months <= 0)
                )
            ) {
                milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
                days = 0;
                months = 0;
            }

            // The following code bubbles up values, see the tests for
            // examples of what that means.
            data.milliseconds = milliseconds % 1000;

            seconds = absFloor(milliseconds / 1000);
            data.seconds = seconds % 60;

            minutes = absFloor(seconds / 60);
            data.minutes = minutes % 60;

            hours = absFloor(minutes / 60);
            data.hours = hours % 24;

            days += absFloor(hours / 24);

            // convert days to months
            monthsFromDays = absFloor(daysToMonths(days));
            months += monthsFromDays;
            days -= absCeil(monthsToDays(monthsFromDays));

            // 12 months -> 1 year
            years = absFloor(months / 12);
            months %= 12;

            data.days = days;
            data.months = months;
            data.years = years;

            return this;
        }

        function daysToMonths(days) {
            // 400 years have 146097 days (taking into account leap year rules)
            // 400 years have 12 months === 4800
            return (days * 4800) / 146097;
        }

        function monthsToDays(months) {
            // the reverse of daysToMonths
            return (months * 146097) / 4800;
        }

        function as(units) {
            if (!this.isValid()) {
                return NaN;
            }
            var days,
                months,
                milliseconds = this._milliseconds;

            units = normalizeUnits(units);

            if (units === 'month' || units === 'quarter' || units === 'year') {
                days = this._days + milliseconds / 864e5;
                months = this._months + daysToMonths(days);
                switch (units) {
                    case 'month':
                        return months;
                    case 'quarter':
                        return months / 3;
                    case 'year':
                        return months / 12;
                }
            } else {
                // handle milliseconds separately because of floating point math errors (issue #1867)
                days = this._days + Math.round(monthsToDays(this._months));
                switch (units) {
                    case 'week':
                        return days / 7 + milliseconds / 6048e5;
                    case 'day':
                        return days + milliseconds / 864e5;
                    case 'hour':
                        return days * 24 + milliseconds / 36e5;
                    case 'minute':
                        return days * 1440 + milliseconds / 6e4;
                    case 'second':
                        return days * 86400 + milliseconds / 1000;
                    // Math.floor prevents floating point math errors here
                    case 'millisecond':
                        return Math.floor(days * 864e5) + milliseconds;
                    default:
                        throw new Error('Unknown unit ' + units);
                }
            }
        }

        // TODO: Use this.as('ms')?
        function valueOf$1() {
            if (!this.isValid()) {
                return NaN;
            }
            return (
                this._milliseconds +
                this._days * 864e5 +
                (this._months % 12) * 2592e6 +
                toInt(this._months / 12) * 31536e6
            );
        }

        function makeAs(alias) {
            return function () {
                return this.as(alias);
            };
        }

        var asMilliseconds = makeAs('ms'),
            asSeconds = makeAs('s'),
            asMinutes = makeAs('m'),
            asHours = makeAs('h'),
            asDays = makeAs('d'),
            asWeeks = makeAs('w'),
            asMonths = makeAs('M'),
            asQuarters = makeAs('Q'),
            asYears = makeAs('y');

        function clone$1() {
            return createDuration(this);
        }

        function get$2(units) {
            units = normalizeUnits(units);
            return this.isValid() ? this[units + 's']() : NaN;
        }

        function makeGetter(name) {
            return function () {
                return this.isValid() ? this._data[name] : NaN;
            };
        }

        var milliseconds = makeGetter('milliseconds'),
            seconds = makeGetter('seconds'),
            minutes = makeGetter('minutes'),
            hours = makeGetter('hours'),
            days = makeGetter('days'),
            months = makeGetter('months'),
            years = makeGetter('years');

        function weeks() {
            return absFloor(this.days() / 7);
        }

        var round = Math.round,
            thresholds = {
                ss: 44, // a few seconds to seconds
                s: 45, // seconds to minute
                m: 45, // minutes to hour
                h: 22, // hours to day
                d: 26, // days to month/week
                w: null, // weeks to month
                M: 11, // months to year
            };

        // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
        function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
            return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
        }

        function relativeTime$1(posNegDuration, withoutSuffix, thresholds, locale) {
            var duration = createDuration(posNegDuration).abs(),
                seconds = round(duration.as('s')),
                minutes = round(duration.as('m')),
                hours = round(duration.as('h')),
                days = round(duration.as('d')),
                months = round(duration.as('M')),
                weeks = round(duration.as('w')),
                years = round(duration.as('y')),
                a =
                    (seconds <= thresholds.ss && ['s', seconds]) ||
                    (seconds < thresholds.s && ['ss', seconds]) ||
                    (minutes <= 1 && ['m']) ||
                    (minutes < thresholds.m && ['mm', minutes]) ||
                    (hours <= 1 && ['h']) ||
                    (hours < thresholds.h && ['hh', hours]) ||
                    (days <= 1 && ['d']) ||
                    (days < thresholds.d && ['dd', days]);

            if (thresholds.w != null) {
                a =
                    a ||
                    (weeks <= 1 && ['w']) ||
                    (weeks < thresholds.w && ['ww', weeks]);
            }
            a = a ||
                (months <= 1 && ['M']) ||
                (months < thresholds.M && ['MM', months]) ||
                (years <= 1 && ['y']) || ['yy', years];

            a[2] = withoutSuffix;
            a[3] = +posNegDuration > 0;
            a[4] = locale;
            return substituteTimeAgo.apply(null, a);
        }

        // This function allows you to set the rounding function for relative time strings
        function getSetRelativeTimeRounding(roundingFunction) {
            if (roundingFunction === undefined) {
                return round;
            }
            if (typeof roundingFunction === 'function') {
                round = roundingFunction;
                return true;
            }
            return false;
        }

        // This function allows you to set a threshold for relative time strings
        function getSetRelativeTimeThreshold(threshold, limit) {
            if (thresholds[threshold] === undefined) {
                return false;
            }
            if (limit === undefined) {
                return thresholds[threshold];
            }
            thresholds[threshold] = limit;
            if (threshold === 's') {
                thresholds.ss = limit - 1;
            }
            return true;
        }

        function humanize(argWithSuffix, argThresholds) {
            if (!this.isValid()) {
                return this.localeData().invalidDate();
            }

            var withSuffix = false,
                th = thresholds,
                locale,
                output;

            if (typeof argWithSuffix === 'object') {
                argThresholds = argWithSuffix;
                argWithSuffix = false;
            }
            if (typeof argWithSuffix === 'boolean') {
                withSuffix = argWithSuffix;
            }
            if (typeof argThresholds === 'object') {
                th = Object.assign({}, thresholds, argThresholds);
                if (argThresholds.s != null && argThresholds.ss == null) {
                    th.ss = argThresholds.s - 1;
                }
            }

            locale = this.localeData();
            output = relativeTime$1(this, !withSuffix, th, locale);

            if (withSuffix) {
                output = locale.pastFuture(+this, output);
            }

            return locale.postformat(output);
        }

        var abs$1 = Math.abs;

        function sign(x) {
            return (x > 0) - (x < 0) || +x;
        }

        function toISOString$1() {
            // for ISO strings we do not use the normal bubbling rules:
            //  * milliseconds bubble up until they become hours
            //  * days do not bubble at all
            //  * months bubble up until they become years
            // This is because there is no context-free conversion between hours and days
            // (think of clock changes)
            // and also not between days and months (28-31 days per month)
            if (!this.isValid()) {
                return this.localeData().invalidDate();
            }

            var seconds = abs$1(this._milliseconds) / 1000,
                days = abs$1(this._days),
                months = abs$1(this._months),
                minutes,
                hours,
                years,
                s,
                total = this.asSeconds(),
                totalSign,
                ymSign,
                daysSign,
                hmsSign;

            if (!total) {
                // this is the same as C#'s (Noda) and python (isodate)...
                // but not other JS (goog.date)
                return 'P0D';
            }

            // 3600 seconds -> 60 minutes -> 1 hour
            minutes = absFloor(seconds / 60);
            hours = absFloor(minutes / 60);
            seconds %= 60;
            minutes %= 60;

            // 12 months -> 1 year
            years = absFloor(months / 12);
            months %= 12;

            // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
            s = seconds ? seconds.toFixed(3).replace(/\.?0+$/, '') : '';

            totalSign = total < 0 ? '-' : '';
            ymSign = sign(this._months) !== sign(total) ? '-' : '';
            daysSign = sign(this._days) !== sign(total) ? '-' : '';
            hmsSign = sign(this._milliseconds) !== sign(total) ? '-' : '';

            return (
                totalSign +
                'P' +
                (years ? ymSign + years + 'Y' : '') +
                (months ? ymSign + months + 'M' : '') +
                (days ? daysSign + days + 'D' : '') +
                (hours || minutes || seconds ? 'T' : '') +
                (hours ? hmsSign + hours + 'H' : '') +
                (minutes ? hmsSign + minutes + 'M' : '') +
                (seconds ? hmsSign + s + 'S' : '')
            );
        }

        var proto$2 = Duration.prototype;

        proto$2.isValid = isValid$1;
        proto$2.abs = abs;
        proto$2.add = add$1;
        proto$2.subtract = subtract$1;
        proto$2.as = as;
        proto$2.asMilliseconds = asMilliseconds;
        proto$2.asSeconds = asSeconds;
        proto$2.asMinutes = asMinutes;
        proto$2.asHours = asHours;
        proto$2.asDays = asDays;
        proto$2.asWeeks = asWeeks;
        proto$2.asMonths = asMonths;
        proto$2.asQuarters = asQuarters;
        proto$2.asYears = asYears;
        proto$2.valueOf = valueOf$1;
        proto$2._bubble = bubble;
        proto$2.clone = clone$1;
        proto$2.get = get$2;
        proto$2.milliseconds = milliseconds;
        proto$2.seconds = seconds;
        proto$2.minutes = minutes;
        proto$2.hours = hours;
        proto$2.days = days;
        proto$2.weeks = weeks;
        proto$2.months = months;
        proto$2.years = years;
        proto$2.humanize = humanize;
        proto$2.toISOString = toISOString$1;
        proto$2.toString = toISOString$1;
        proto$2.toJSON = toISOString$1;
        proto$2.locale = locale;
        proto$2.localeData = localeData;

        proto$2.toIsoString = deprecate(
            'toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)',
            toISOString$1
        );
        proto$2.lang = lang;

        // FORMATTING

        addFormatToken('X', 0, 0, 'unix');
        addFormatToken('x', 0, 0, 'valueOf');

        // PARSING

        addRegexToken('x', matchSigned);
        addRegexToken('X', matchTimestamp);
        addParseToken('X', function (input, array, config) {
            config._d = new Date(parseFloat(input) * 1000);
        });
        addParseToken('x', function (input, array, config) {
            config._d = new Date(toInt(input));
        });

        //! moment.js

        hooks.version = '2.29.4';

        setHookCallback(createLocal);

        hooks.fn = proto;
        hooks.min = min;
        hooks.max = max;
        hooks.now = now;
        hooks.utc = createUTC;
        hooks.unix = createUnix;
        hooks.months = listMonths;
        hooks.isDate = isDate;
        hooks.locale = getSetGlobalLocale;
        hooks.invalid = createInvalid;
        hooks.duration = createDuration;
        hooks.isMoment = isMoment;
        hooks.weekdays = listWeekdays;
        hooks.parseZone = createInZone;
        hooks.localeData = getLocale;
        hooks.isDuration = isDuration;
        hooks.monthsShort = listMonthsShort;
        hooks.weekdaysMin = listWeekdaysMin;
        hooks.defineLocale = defineLocale;
        hooks.updateLocale = updateLocale;
        hooks.locales = listLocales;
        hooks.weekdaysShort = listWeekdaysShort;
        hooks.normalizeUnits = normalizeUnits;
        hooks.relativeTimeRounding = getSetRelativeTimeRounding;
        hooks.relativeTimeThreshold = getSetRelativeTimeThreshold;
        hooks.calendarFormat = getCalendarFormat;
        hooks.prototype = proto;

        // currently HTML5 input type only supports 24-hour formats
        hooks.HTML5_FMT = {
            DATETIME_LOCAL: 'YYYY-MM-DDTHH:mm', // <input type="datetime-local" />
            DATETIME_LOCAL_SECONDS: 'YYYY-MM-DDTHH:mm:ss', // <input type="datetime-local" step="1" />
            DATETIME_LOCAL_MS: 'YYYY-MM-DDTHH:mm:ss.SSS', // <input type="datetime-local" step="0.001" />
            DATE: 'YYYY-MM-DD', // <input type="date" />
            TIME: 'HH:mm', // <input type="time" />
            TIME_SECONDS: 'HH:mm:ss', // <input type="time" step="1" />
            TIME_MS: 'HH:mm:ss.SSS', // <input type="time" step="0.001" />
            WEEK: 'GGGG-[W]WW', // <input type="week" />
            MONTH: 'YYYY-MM', // <input type="month" />
        };

        return hooks;

    })));
    });

    function createUser() {
      const localUser = JSON.parse(localStorage.getItem('gotrue.user'));

      let u = null;
      if (localUser) {
        u = {
          username: localUser.user_metadata.full_name,
          email: localUser.email,
          access_token: localUser.token.access_token,
          expires_at: localUser.token.expires_at,
          refresh_token: localUser.token.refresh_token,
          token_type: localUser.token.token_type,
          rolea: localUser.app_metadata ||'',
        };
      }
      const { subscribe, set } = writable(u);

      return {
        subscribe,
        login(user) {
          const currentUser = {
            username: user.user_metadata.full_name,
            email: user.email,
            access_token: user.token.access_token,
            expires_at: user.token.expires_at,
            refresh_token: user.token.refresh_token,
            token_type: user.token.token_type,
            rolea: localUser.app_metadata ||' ',
          };
          set(currentUser);
        },
        logout() {
          set(null);
        },
      }
    }

    function createRedirectURL() {
      const { subscribe, set } = writable('');
      return {
        subscribe,
        setRedirectURL(url) {
          set(url);
        },
        clearRedirectURL() {
          set('');
        },
      }
    }
    const user = createUser();
    const redirectURL = createRedirectURL();
    const appInfo = writable([]);
    const userList = writable([]);
    const categoryList = writable([]);
    const tagsList = writable([]);

    /* src\common\PostImage.svelte generated by Svelte v3.12.1 */

    const file$1 = "src\\common\\PostImage.svelte";

    // (25:0) {:else}
    function create_else_block$1(ctx) {
    	var img, img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "src", img_src_value = `http://placehold.jp/24/dedede/ffffff/800x500.png?text=${ctx.alt}`);
    			attr_dev(img, "alt", ctx.alt);
    			attr_dev(img, "class", "img-fluid");
    			add_location(img, file$1, 25, 2, 609);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.alt) && img_src_value !== (img_src_value = `http://placehold.jp/24/dedede/ffffff/800x500.png?text=${ctx.alt}`)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (changed.alt) {
    				attr_dev(img, "alt", ctx.alt);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(img);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$1.name, type: "else", source: "(25:0) {:else}", ctx });
    	return block;
    }

    // (23:0) {#if src}
    function create_if_block$1(ctx) {
    	var img;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "src", ctx.src);
    			attr_dev(img, "alt", ctx.alt);
    			attr_dev(img, "class", "img-fluid");
    			add_location(img, file$1, 23, 2, 561);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.src) {
    				attr_dev(img, "src", ctx.src);
    			}

    			if (changed.alt) {
    				attr_dev(img, "alt", ctx.alt);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(img);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(23:0) {#if src}", ctx });
    	return block;
    }

    function create_fragment$3(ctx) {
    	var if_block_anchor;

    	function select_block_type(changed, ctx) {
    		if (ctx.src) return create_if_block$1;
    		return create_else_block$1;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block) {
    				if_block.p(changed, ctx);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let images = [];

      let { image, size, alt } = $$props;
      const apiUrl = "https://ganesankar.co.in/wp-json/wp/v2/media/" + image;
      let src = "";
      onMount(async function() {
        if (image) {
          const response = await fetch(apiUrl);
          images = await response.json();
          if (images && images.media_details && images.media_details.sizes && images.media_details.sizes[size]) {
            $$invalidate('src', src = images.media_details.sizes[size].source_url || '');
          }
        } 
      });

    	const writable_props = ['image', 'size', 'alt'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<PostImage> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('image' in $$props) $$invalidate('image', image = $$props.image);
    		if ('size' in $$props) $$invalidate('size', size = $$props.size);
    		if ('alt' in $$props) $$invalidate('alt', alt = $$props.alt);
    	};

    	$$self.$capture_state = () => {
    		return { images, image, size, alt, src };
    	};

    	$$self.$inject_state = $$props => {
    		if ('images' in $$props) images = $$props.images;
    		if ('image' in $$props) $$invalidate('image', image = $$props.image);
    		if ('size' in $$props) $$invalidate('size', size = $$props.size);
    		if ('alt' in $$props) $$invalidate('alt', alt = $$props.alt);
    		if ('src' in $$props) $$invalidate('src', src = $$props.src);
    	};

    	return { image, size, alt, src };
    }

    class PostImage extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, ["image", "size", "alt"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "PostImage", options, id: create_fragment$3.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.image === undefined && !('image' in props)) {
    			console.warn("<PostImage> was created without expected prop 'image'");
    		}
    		if (ctx.size === undefined && !('size' in props)) {
    			console.warn("<PostImage> was created without expected prop 'size'");
    		}
    		if (ctx.alt === undefined && !('alt' in props)) {
    			console.warn("<PostImage> was created without expected prop 'alt'");
    		}
    	}

    	get image() {
    		throw new Error("<PostImage>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set image(value) {
    		throw new Error("<PostImage>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<PostImage>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<PostImage>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get alt() {
    		throw new Error("<PostImage>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set alt(value) {
    		throw new Error("<PostImage>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\routes\Home.svelte generated by Svelte v3.12.1 */

    const file$2 = "src\\routes\\Home.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.post = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.post = list[i];
    	return child_ctx;
    }

    // (167:10) {#if portfolio && portfolio.length > 0}
    function create_if_block_2(ctx) {
    	var each_1_anchor, current;

    	let each_value_1 = ctx.portfolio;

    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.portfolio || changed.moment) {
    				each_value_1 = ctx.portfolio;

    				let i;
    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();
    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach_dev(each_1_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2.name, type: "if", source: "(167:10) {#if portfolio && portfolio.length > 0}", ctx });
    	return block;
    }

    // (188:24) {#if post.date}
    function create_if_block_3(ctx) {
    	var t_value = moment(ctx.post.date).format('MMM DD, YYYY') + "", t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.portfolio) && t_value !== (t_value = moment(ctx.post.date).format('MMM DD, YYYY') + "")) {
    				set_data_dev(t, t_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3.name, type: "if", source: "(188:24) {#if post.date}", ctx });
    	return block;
    }

    // (171:16) <Link                   to={`portfolio/${post.slug}`}                   css="post animsition-link aos-init"                   href="blog-single.html"                   >
    function create_default_slot_1(ctx) {
    	var figure, t0, div1, div0, h2, raw_value = ctx.post.title.rendered + "", t1, span, current;

    	var postimage = new PostImage({
    		props: {
    		size: "medium_large",
    		image: ctx.post.featured_media,
    		alt: ctx.post.title.rendered
    	},
    		$$inline: true
    	});

    	var if_block = (ctx.post.date) && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			figure = element("figure");
    			postimage.$$.fragment.c();
    			t0 = space();
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			t1 = space();
    			span = element("span");
    			if (if_block) if_block.c();
    			add_location(figure, file$2, 175, 18, 6231);
    			add_location(h2, file$2, 183, 22, 6558);
    			add_location(span, file$2, 186, 22, 6665);
    			attr_dev(div0, "class", "post-hover-inner");
    			add_location(div0, file$2, 182, 20, 6505);
    			attr_dev(div1, "class", "post-hover");
    			add_location(div1, file$2, 181, 18, 6460);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, figure, anchor);
    			mount_component(postimage, figure, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			h2.innerHTML = raw_value;
    			append_dev(div0, t1);
    			append_dev(div0, span);
    			if (if_block) if_block.m(span, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var postimage_changes = {};
    			if (changed.portfolio) postimage_changes.image = ctx.post.featured_media;
    			if (changed.portfolio) postimage_changes.alt = ctx.post.title.rendered;
    			postimage.$set(postimage_changes);

    			if ((!current || changed.portfolio) && raw_value !== (raw_value = ctx.post.title.rendered + "")) {
    				h2.innerHTML = raw_value;
    			}

    			if (ctx.post.date) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(span, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(postimage.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(postimage.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(figure);
    			}

    			destroy_component(postimage);

    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(div1);
    			}

    			if (if_block) if_block.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1.name, type: "slot", source: "(171:16) <Link                   to={`portfolio/${post.slug}`}                   css=\"post animsition-link aos-init\"                   href=\"blog-single.html\"                   >", ctx });
    	return block;
    }

    // (168:12) {#each portfolio as post}
    function create_each_block_1(ctx) {
    	var div, t, current;

    	var link = new Link({
    		props: {
    		to: `portfolio/${ctx.post.slug}`,
    		css: "post animsition-link aos-init",
    		href: "blog-single.html",
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			div = element("div");
    			link.$$.fragment.c();
    			t = space();
    			attr_dev(div, "class", "col-lg-6");
    			attr_dev(div, "data-aos", "fade-up");
    			attr_dev(div, "data-aos-delay", "200");
    			add_location(div, file$2, 168, 14, 5950);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(link, div, null);
    			append_dev(div, t);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.portfolio) link_changes.to = `portfolio/${ctx.post.slug}`;
    			if (changed.$$scope || changed.portfolio) link_changes.$$scope = { changed, ctx };
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_component(link);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_1.name, type: "each", source: "(168:12) {#each portfolio as post}", ctx });
    	return block;
    }

    // (222:10) {#if posts && posts.length > 0}
    function create_if_block$2(ctx) {
    	var each_1_anchor, current;

    	let each_value = ctx.posts;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.posts || changed.moment) {
    				each_value = ctx.posts;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach_dev(each_1_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$2.name, type: "if", source: "(222:10) {#if posts && posts.length > 0}", ctx });
    	return block;
    }

    // (243:24) {#if post.date}
    function create_if_block_1$1(ctx) {
    	var t_value = moment(ctx.post.date).format('MMM DD, YYYY') + "", t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.posts) && t_value !== (t_value = moment(ctx.post.date).format('MMM DD, YYYY') + "")) {
    				set_data_dev(t, t_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$1.name, type: "if", source: "(243:24) {#if post.date}", ctx });
    	return block;
    }

    // (226:16) <Link                   to={`post/${post.slug}`}                   css="post animsition-link aos-init"                   href="blog-single.html"                   >
    function create_default_slot(ctx) {
    	var figure, t0, div1, div0, h2, raw_value = ctx.post.title.rendered + "", t1, span, current;

    	var postimage = new PostImage({
    		props: {
    		size: "medium_large",
    		image: ctx.post.featured_media,
    		alt: ctx.post.title.rendered
    	},
    		$$inline: true
    	});

    	var if_block = (ctx.post.date) && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			figure = element("figure");
    			postimage.$$.fragment.c();
    			t0 = space();
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			t1 = space();
    			span = element("span");
    			if (if_block) if_block.c();
    			add_location(figure, file$2, 230, 18, 7927);
    			add_location(h2, file$2, 238, 22, 8254);
    			add_location(span, file$2, 241, 22, 8361);
    			attr_dev(div0, "class", "post-hover-inner");
    			add_location(div0, file$2, 237, 20, 8201);
    			attr_dev(div1, "class", "post-hover");
    			add_location(div1, file$2, 236, 18, 8156);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, figure, anchor);
    			mount_component(postimage, figure, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			h2.innerHTML = raw_value;
    			append_dev(div0, t1);
    			append_dev(div0, span);
    			if (if_block) if_block.m(span, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var postimage_changes = {};
    			if (changed.posts) postimage_changes.image = ctx.post.featured_media;
    			if (changed.posts) postimage_changes.alt = ctx.post.title.rendered;
    			postimage.$set(postimage_changes);

    			if ((!current || changed.posts) && raw_value !== (raw_value = ctx.post.title.rendered + "")) {
    				h2.innerHTML = raw_value;
    			}

    			if (ctx.post.date) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					if_block.m(span, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(postimage.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(postimage.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(figure);
    			}

    			destroy_component(postimage);

    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(div1);
    			}

    			if (if_block) if_block.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot.name, type: "slot", source: "(226:16) <Link                   to={`post/${post.slug}`}                   css=\"post animsition-link aos-init\"                   href=\"blog-single.html\"                   >", ctx });
    	return block;
    }

    // (223:12) {#each posts as post}
    function create_each_block(ctx) {
    	var div, t, current;

    	var link = new Link({
    		props: {
    		to: `post/${ctx.post.slug}`,
    		css: "post animsition-link aos-init",
    		href: "blog-single.html",
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			div = element("div");
    			link.$$.fragment.c();
    			t = space();
    			attr_dev(div, "class", "col-lg-6");
    			attr_dev(div, "data-aos", "fade-up");
    			attr_dev(div, "data-aos-delay", "200");
    			add_location(div, file$2, 223, 14, 7651);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(link, div, null);
    			append_dev(div, t);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.posts) link_changes.to = `post/${ctx.post.slug}`;
    			if (changed.$$scope || changed.posts) link_changes.$$scope = { changed, ctx };
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_component(link);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(223:12) {#each posts as post}", ctx });
    	return block;
    }

    function create_fragment$4(ctx) {
    	var scrolling = false, clear_scrolling = () => { scrolling = false; }, scrolling_timeout, t0, section0, div2, div1, div0, h1, t1, br, t2, t3, a0, t4, section1, div13, div12, div3, h20, t6, div11, div5, div4, h21, t8, div10, div9, div8, div6, span0, t9, div7, h30, t11, p0, t13, p1, t15, section2, div32, div31, div14, h22, t17, div30, div16, div15, h23, t19, div29, div20, div19, div17, span1, t20, div18, h31, t22, p2, t24, div24, div23, div21, span2, t25, div22, h32, t27, p3, t29, div28, div27, div25, span3, t30, div26, h33, t32, p4, t34, section3, div39, div36, div33, h24, t36, div35, div34, t37, div38, div37, a1, t39, section4, div46, div43, div40, h25, t41, div42, div41, t42, div45, div44, a2, current, dispose;

    	add_render_callback(ctx.onwindowresize);

    	add_render_callback(ctx.onwindowscroll);

    	var if_block0 = (ctx.portfolio && ctx.portfolio.length > 0) && create_if_block_2(ctx);

    	var if_block1 = (ctx.posts && ctx.posts.length > 0) && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			t0 = space();
    			section0 = element("section");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			t1 = text("I'm Ganesan Karuppaiya\n          ");
    			br = element("br");
    			t2 = text("\n          I build things for the web.");
    			t3 = space();
    			a0 = element("a");
    			t4 = space();
    			section1 = element("section");
    			div13 = element("div");
    			div12 = element("div");
    			div3 = element("div");
    			h20 = element("h2");
    			h20.textContent = "About me";
    			t6 = space();
    			div11 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			h21 = element("h2");
    			h21.textContent = "In Short, Creative Designer, UI/UX Designer & Full Stack Developer";
    			t8 = space();
    			div10 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div6 = element("div");
    			span0 = element("span");
    			t9 = space();
    			div7 = element("div");
    			h30 = element("h3");
    			h30.textContent = "In Short";
    			t11 = space();
    			p0 = element("p");
    			p0.textContent = "I'm a UI/ UX engineer based in Chennai, IN. Specializing in\n                  building (and occasionally designing) exceptional,\n                  high-quality websites and applications with clean and sharp\n                  interfaces and innovator focusing business, users and success";
    			t13 = space();
    			p1 = element("p");
    			p1.textContent = "I enjoys building things that live on the internet. I develop\n                  exceptional websites and web apps that provide intuitive,\n                  pixel-perfect user interfaces with ,efficient and modern\n                  backends.";
    			t15 = space();
    			section2 = element("section");
    			div32 = element("div");
    			div31 = element("div");
    			div14 = element("div");
    			h22 = element("h2");
    			h22.textContent = "What I Do";
    			t17 = space();
    			div30 = element("div");
    			div16 = element("div");
    			div15 = element("div");
    			h23 = element("h2");
    			h23.textContent = "I develop exceptional websites and web apps that provide intuitive, pixel-perfect user interfaces with ,efficient and modern backends.";
    			t19 = space();
    			div29 = element("div");
    			div20 = element("div");
    			div19 = element("div");
    			div17 = element("div");
    			span1 = element("span");
    			t20 = space();
    			div18 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Designing and Branding";
    			t22 = space();
    			p2 = element("p");
    			p2.textContent = "Every great design starts with an simple idea and best way to present an idea is to visualise it. It makes your idea alive. In many cases, visualisation helps to understand the story of the business idea.";
    			t24 = space();
    			div24 = element("div");
    			div23 = element("div");
    			div21 = element("div");
    			span2 = element("span");
    			t25 = space();
    			div22 = element("div");
    			h32 = element("h3");
    			h32.textContent = "UI/ UX Development";
    			t27 = space();
    			p3 = element("p");
    			p3.textContent = "It’s very important that all the fundamental parts are well defined and working This is where problem solving meets visual impact. I’ll unite products and users, design and experiences.";
    			t29 = space();
    			div28 = element("div");
    			div27 = element("div");
    			div25 = element("div");
    			span3 = element("span");
    			t30 = space();
    			div26 = element("div");
    			h33 = element("h3");
    			h33.textContent = "Rich Web Products";
    			t32 = space();
    			p4 = element("p");
    			p4.textContent = "It doesn’t stop with design. I can develop your product from visual concept to fully functional website with defined standards.";
    			t34 = space();
    			section3 = element("section");
    			div39 = element("div");
    			div36 = element("div");
    			div33 = element("div");
    			h24 = element("h2");
    			h24.textContent = "Recent works";
    			t36 = space();
    			div35 = element("div");
    			div34 = element("div");
    			if (if_block0) if_block0.c();
    			t37 = space();
    			div38 = element("div");
    			div37 = element("div");
    			a1 = element("a");
    			a1.textContent = "Read All Blog Posts";
    			t39 = space();
    			section4 = element("section");
    			div46 = element("div");
    			div43 = element("div");
    			div40 = element("div");
    			h25 = element("h2");
    			h25.textContent = "Recent Blog Posts";
    			t41 = space();
    			div42 = element("div");
    			div41 = element("div");
    			if (if_block1) if_block1.c();
    			t42 = space();
    			div45 = element("div");
    			div44 = element("div");
    			a2 = element("a");
    			a2.textContent = "Read All Blog Posts";
    			document.title = "Home Page";
    			add_location(br, file$2, 35, 10, 1111);
    			add_location(h1, file$2, 33, 8, 1063);
    			attr_dev(a0, "href", "#next");
    			attr_dev(a0, "class", "go-down js-smoothscroll");
    			add_location(a0, file$2, 38, 8, 1178);
    			attr_dev(div0, "class", "col-md-10 aos-init aos-animate");
    			attr_dev(div0, "data-aos", "fade-up");
    			add_location(div0, file$2, 32, 6, 991);
    			attr_dev(div1, "class", "row align-items-center justify-content-center intro");
    			add_location(div1, file$2, 31, 4, 919);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$2, 30, 2, 891);
    			attr_dev(section0, "class", "templateux-hero");
    			add_location(section0, file$2, 29, 0, 855);
    			attr_dev(h20, "class", "section-heading mt-3");
    			add_location(h20, file$2, 47, 8, 1458);
    			attr_dev(div3, "class", "col-md-4 aos-init aos-animate");
    			attr_dev(div3, "data-aos", "fade-up");
    			add_location(div3, file$2, 46, 6, 1387);
    			attr_dev(h21, "class", "mb-5");
    			add_location(h21, file$2, 55, 12, 1704);
    			attr_dev(div4, "class", "col-md-12");
    			add_location(div4, file$2, 54, 10, 1668);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$2, 53, 8, 1640);
    			attr_dev(span0, "class", "icon-monitor display-3");
    			add_location(span0, file$2, 64, 16, 2042);
    			attr_dev(div6, "class", "mr-4 icon");
    			add_location(div6, file$2, 63, 14, 2002);
    			attr_dev(h30, "class", "h5");
    			add_location(h30, file$2, 67, 16, 2158);
    			add_location(p0, file$2, 68, 16, 2204);
    			add_location(p1, file$2, 74, 16, 2550);
    			attr_dev(div7, "class", "media-body");
    			add_location(div7, file$2, 66, 14, 2117);
    			attr_dev(div8, "class", "media templateux-media mb-4");
    			add_location(div8, file$2, 62, 12, 1946);
    			attr_dev(div9, "class", "col-lg-12");
    			add_location(div9, file$2, 61, 10, 1910);
    			attr_dev(div10, "class", "row pt-sm-0 pt-md-5 mb-5");
    			add_location(div10, file$2, 60, 8, 1861);
    			attr_dev(div11, "class", "col-md-8 aos-init aos-animate");
    			attr_dev(div11, "data-aos", "fade-up");
    			attr_dev(div11, "data-aos-delay", "100");
    			add_location(div11, file$2, 49, 6, 1524);
    			attr_dev(div12, "class", "row justify-content-center");
    			add_location(div12, file$2, 45, 4, 1340);
    			attr_dev(div13, "class", "container");
    			add_location(div13, file$2, 44, 2, 1312);
    			attr_dev(section1, "class", "templateux-section");
    			add_location(section1, file$2, 43, 0, 1273);
    			attr_dev(h22, "class", "section-heading mt-3");
    			add_location(h22, file$2, 94, 8, 3161);
    			attr_dev(div14, "class", "col-md-4 aos-init aos-animate");
    			attr_dev(div14, "data-aos", "fade-up");
    			add_location(div14, file$2, 93, 6, 3090);
    			attr_dev(h23, "class", "mb-5");
    			add_location(h23, file$2, 102, 12, 3408);
    			attr_dev(div15, "class", "col-md-12");
    			add_location(div15, file$2, 101, 10, 3372);
    			attr_dev(div16, "class", "row");
    			add_location(div16, file$2, 100, 8, 3344);
    			attr_dev(span1, "class", "icon-monitor display-3");
    			add_location(span1, file$2, 111, 16, 3814);
    			attr_dev(div17, "class", "mr-4 icon");
    			add_location(div17, file$2, 110, 14, 3774);
    			attr_dev(h31, "class", "h5");
    			add_location(h31, file$2, 114, 16, 3930);
    			add_location(p2, file$2, 115, 16, 3989);
    			attr_dev(div18, "class", "media-body");
    			add_location(div18, file$2, 113, 14, 3889);
    			attr_dev(div19, "class", "media templateux-media mb-4");
    			add_location(div19, file$2, 109, 12, 3718);
    			attr_dev(div20, "class", "col-lg-12");
    			add_location(div20, file$2, 108, 10, 3682);
    			attr_dev(span2, "class", "icon-command display-3");
    			add_location(span2, file$2, 124, 16, 4438);
    			attr_dev(div21, "class", "mr-4 icon");
    			add_location(div21, file$2, 123, 14, 4398);
    			attr_dev(h32, "class", "h5");
    			add_location(h32, file$2, 127, 16, 4554);
    			add_location(p3, file$2, 128, 16, 4609);
    			attr_dev(div22, "class", "media-body");
    			add_location(div22, file$2, 126, 14, 4513);
    			attr_dev(div23, "class", "media templateux-media mb-4");
    			add_location(div23, file$2, 122, 12, 4342);
    			attr_dev(div24, "class", "col-lg-12");
    			add_location(div24, file$2, 121, 10, 4306);
    			attr_dev(span3, "class", "icon-feather display-3");
    			add_location(span3, file$2, 138, 16, 5043);
    			attr_dev(div25, "class", "mr-4 icon");
    			add_location(div25, file$2, 137, 14, 5003);
    			attr_dev(h33, "class", "h5");
    			add_location(h33, file$2, 141, 16, 5159);
    			add_location(p4, file$2, 142, 16, 5213);
    			attr_dev(div26, "class", "media-body");
    			add_location(div26, file$2, 140, 14, 5118);
    			attr_dev(div27, "class", "media templateux-media mb-4");
    			add_location(div27, file$2, 136, 12, 4947);
    			attr_dev(div28, "class", "col-lg-12");
    			add_location(div28, file$2, 135, 10, 4911);
    			attr_dev(div29, "class", "row pt-sm-0 pt-md-5 mb-5");
    			add_location(div29, file$2, 107, 8, 3633);
    			attr_dev(div30, "class", "col-md-8 aos-init aos-animate");
    			attr_dev(div30, "data-aos", "fade-up");
    			attr_dev(div30, "data-aos-delay", "100");
    			add_location(div30, file$2, 96, 6, 3228);
    			attr_dev(div31, "class", "row justify-content-center");
    			add_location(div31, file$2, 92, 4, 3043);
    			attr_dev(div32, "class", "container");
    			add_location(div32, file$2, 91, 2, 3015);
    			attr_dev(section2, "class", "templateux-section");
    			add_location(section2, file$2, 90, 0, 2976);
    			attr_dev(h24, "class", "section-heading mt-3");
    			add_location(h24, file$2, 160, 8, 5726);
    			attr_dev(div33, "class", "col-md-4 aos-init aos-animate");
    			attr_dev(div33, "data-aos", "fade-up");
    			add_location(div33, file$2, 159, 6, 5655);
    			attr_dev(div34, "class", "row");
    			add_location(div34, file$2, 164, 8, 5829);
    			attr_dev(div35, "class", "col-md-8");
    			add_location(div35, file$2, 162, 6, 5797);
    			attr_dev(div36, "class", "row justify-content-center");
    			add_location(div36, file$2, 158, 4, 5608);
    			attr_dev(a1, "href", "blog.html");
    			attr_dev(a1, "class", "animsition-link");
    			add_location(a1, file$2, 205, 8, 7132);
    			attr_dev(div37, "class", "col-md-8 ml-auto");
    			add_location(div37, file$2, 204, 6, 7093);
    			attr_dev(div38, "class", "row aos-init");
    			attr_dev(div38, "data-aos", "fade-up");
    			attr_dev(div38, "data-aos-delay", "400");
    			add_location(div38, file$2, 203, 4, 7020);
    			attr_dev(div39, "class", "container");
    			add_location(div39, file$2, 157, 2, 5580);
    			attr_dev(section3, "class", "templateux-section mb-5");
    			add_location(section3, file$2, 156, 0, 5536);
    			attr_dev(h25, "class", "section-heading mt-3");
    			add_location(h25, file$2, 215, 8, 7435);
    			attr_dev(div40, "class", "col-md-4 aos-init aos-animate");
    			attr_dev(div40, "data-aos", "fade-up");
    			add_location(div40, file$2, 214, 6, 7364);
    			attr_dev(div41, "class", "row");
    			add_location(div41, file$2, 219, 8, 7542);
    			attr_dev(div42, "class", "col-md-8");
    			add_location(div42, file$2, 217, 6, 7510);
    			attr_dev(div43, "class", "row justify-content-center");
    			add_location(div43, file$2, 213, 4, 7317);
    			attr_dev(a2, "href", "blog.html");
    			attr_dev(a2, "class", "animsition-link");
    			add_location(a2, file$2, 260, 8, 8828);
    			attr_dev(div44, "class", "col-md-8 ml-auto");
    			add_location(div44, file$2, 259, 6, 8789);
    			attr_dev(div45, "class", "row aos-init");
    			attr_dev(div45, "data-aos", "fade-up");
    			attr_dev(div45, "data-aos-delay", "400");
    			add_location(div45, file$2, 258, 4, 8716);
    			attr_dev(div46, "class", "container");
    			add_location(div46, file$2, 212, 2, 7289);
    			attr_dev(section4, "class", "templateux-section mb-5");
    			add_location(section4, file$2, 211, 0, 7245);

    			dispose = [
    				listen_dev(window, "resize", ctx.onwindowresize),
    				listen_dev(window, "scroll", () => {
    					scrolling = true;
    					clearTimeout(scrolling_timeout);
    					scrolling_timeout = setTimeout(clear_scrolling, 100);
    					ctx.onwindowscroll();
    				})
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, section0, anchor);
    			append_dev(section0, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(h1, t1);
    			append_dev(h1, br);
    			append_dev(h1, t2);
    			append_dev(div0, t3);
    			append_dev(div0, a0);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, section1, anchor);
    			append_dev(section1, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div3);
    			append_dev(div3, h20);
    			append_dev(div12, t6);
    			append_dev(div12, div11);
    			append_dev(div11, div5);
    			append_dev(div5, div4);
    			append_dev(div4, h21);
    			append_dev(div11, t8);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div6);
    			append_dev(div6, span0);
    			append_dev(div8, t9);
    			append_dev(div8, div7);
    			append_dev(div7, h30);
    			append_dev(div7, t11);
    			append_dev(div7, p0);
    			append_dev(div7, t13);
    			append_dev(div7, p1);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, section2, anchor);
    			append_dev(section2, div32);
    			append_dev(div32, div31);
    			append_dev(div31, div14);
    			append_dev(div14, h22);
    			append_dev(div31, t17);
    			append_dev(div31, div30);
    			append_dev(div30, div16);
    			append_dev(div16, div15);
    			append_dev(div15, h23);
    			append_dev(div30, t19);
    			append_dev(div30, div29);
    			append_dev(div29, div20);
    			append_dev(div20, div19);
    			append_dev(div19, div17);
    			append_dev(div17, span1);
    			append_dev(div19, t20);
    			append_dev(div19, div18);
    			append_dev(div18, h31);
    			append_dev(div18, t22);
    			append_dev(div18, p2);
    			append_dev(div29, t24);
    			append_dev(div29, div24);
    			append_dev(div24, div23);
    			append_dev(div23, div21);
    			append_dev(div21, span2);
    			append_dev(div23, t25);
    			append_dev(div23, div22);
    			append_dev(div22, h32);
    			append_dev(div22, t27);
    			append_dev(div22, p3);
    			append_dev(div29, t29);
    			append_dev(div29, div28);
    			append_dev(div28, div27);
    			append_dev(div27, div25);
    			append_dev(div25, span3);
    			append_dev(div27, t30);
    			append_dev(div27, div26);
    			append_dev(div26, h33);
    			append_dev(div26, t32);
    			append_dev(div26, p4);
    			insert_dev(target, t34, anchor);
    			insert_dev(target, section3, anchor);
    			append_dev(section3, div39);
    			append_dev(div39, div36);
    			append_dev(div36, div33);
    			append_dev(div33, h24);
    			append_dev(div36, t36);
    			append_dev(div36, div35);
    			append_dev(div35, div34);
    			if (if_block0) if_block0.m(div34, null);
    			append_dev(div39, t37);
    			append_dev(div39, div38);
    			append_dev(div38, div37);
    			append_dev(div37, a1);
    			insert_dev(target, t39, anchor);
    			insert_dev(target, section4, anchor);
    			append_dev(section4, div46);
    			append_dev(div46, div43);
    			append_dev(div43, div40);
    			append_dev(div40, h25);
    			append_dev(div43, t41);
    			append_dev(div43, div42);
    			append_dev(div42, div41);
    			if (if_block1) if_block1.m(div41, null);
    			append_dev(div46, t42);
    			append_dev(div46, div45);
    			append_dev(div45, div44);
    			append_dev(div44, a2);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.x && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window.pageXOffset, ctx.x);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			if (ctx.portfolio && ctx.portfolio.length > 0) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div34, null);
    				}
    			} else if (if_block0) {
    				group_outros();
    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});
    				check_outros();
    			}

    			if (ctx.posts && ctx.posts.length > 0) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div41, null);
    				}
    			} else if (if_block1) {
    				group_outros();
    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(section0);
    				detach_dev(t4);
    				detach_dev(section1);
    				detach_dev(t15);
    				detach_dev(section2);
    				detach_dev(t34);
    				detach_dev(section3);
    			}

    			if (if_block0) if_block0.d();

    			if (detaching) {
    				detach_dev(t39);
    				detach_dev(section4);
    			}

    			if (if_block1) if_block1.d();
    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    const postApiUrl = "https://ganesankar.co.in/wp-json/wp/v2/posts";

    const portApiUrl = "https://ganesankar.co.in/wp-json/wp/v2/portfolio";

    function instance$4($$self, $$props, $$invalidate) {
    	
      let posts = [];
      let portfolio = [];
      let y;
      let x;
      onMount(async function() {
        const postresponse = await fetch(postApiUrl);
        const postsall = await postresponse.json();
        $$invalidate('posts', posts = postsall.slice(0, 6));


        const portResponse = await fetch(portApiUrl);
        const portsall = await portResponse.json();
        $$invalidate('portfolio', portfolio = portsall.slice(0, 6));
      });

    	function onwindowresize() {
    		y = window.innerHeight; $$invalidate('y', y);
    	}

    	function onwindowscroll() {
    		x = window.pageYOffset; $$invalidate('x', x);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('posts' in $$props) $$invalidate('posts', posts = $$props.posts);
    		if ('portfolio' in $$props) $$invalidate('portfolio', portfolio = $$props.portfolio);
    		if ('y' in $$props) $$invalidate('y', y = $$props.y);
    		if ('x' in $$props) $$invalidate('x', x = $$props.x);
    	};

    	return {
    		posts,
    		portfolio,
    		y,
    		x,
    		onwindowresize,
    		onwindowscroll
    	};
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Home", options, id: create_fragment$4.name });
    	}
    }

    /* src\common\Comments.svelte generated by Svelte v3.12.1 */

    const file$3 = "src\\common\\Comments.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.comment = list[i];
    	return child_ctx;
    }

    // (15:0) {#if list && list.length > 0}
    function create_if_block$3(ctx) {
    	var h3, t0_value = ctx.list.length + "", t0, t1, t2, ul;

    	let each_value = ctx.list.reverse();

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = text(" Comments");
    			t2 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(h3, "class", "mb-5");
    			add_location(h3, file$3, 15, 2, 363);
    			attr_dev(ul, "class", "comment-list");
    			add_location(ul, file$3, 16, 2, 410);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t0);
    			append_dev(h3, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},

    		p: function update(changed, ctx) {
    			if ((changed.list) && t0_value !== (t0_value = ctx.list.length + "")) {
    				set_data_dev(t0, t0_value);
    			}

    			if (changed.list || changed.moment) {
    				each_value = ctx.list.reverse();

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h3);
    				detach_dev(t2);
    				detach_dev(ul);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$3.name, type: "if", source: "(15:0) {#if list && list.length > 0}", ctx });
    	return block;
    }

    // (18:4) {#each list.reverse() as comment}
    function create_each_block$1(ctx) {
    	var li, div0, t0, div2, h3, raw0_value = ctx.comment.author_name + "", t1, div1, t2_value = moment(ctx.comment.date).format('MMM DD, YYYY') + "", t2, t3, t4_value = moment(ctx.comment.date).format('HH:mm') + "", t4, t5, html_tag, raw1_value = ctx.comment.content.rendered + "", t6;

    	const block = {
    		c: function create() {
    			li = element("li");
    			div0 = element("div");
    			t0 = space();
    			div2 = element("div");
    			h3 = element("h3");
    			t1 = space();
    			div1 = element("div");
    			t2 = text(t2_value);
    			t3 = text(" at ");
    			t4 = text(t4_value);
    			t5 = space();
    			t6 = space();
    			attr_dev(div0, "class", "vcard bio");
    			add_location(div0, file$3, 19, 8, 509);
    			add_location(h3, file$3, 21, 10, 580);
    			attr_dev(div1, "class", "meta");
    			add_location(div1, file$3, 24, 10, 651);
    			html_tag = new HtmlTag(raw1_value, null);
    			attr_dev(div2, "class", "comment-body");
    			add_location(div2, file$3, 20, 8, 543);
    			attr_dev(li, "class", "comment");
    			add_location(li, file$3, 18, 6, 480);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, div0);
    			append_dev(li, t0);
    			append_dev(li, div2);
    			append_dev(div2, h3);
    			h3.innerHTML = raw0_value;
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, t2);
    			append_dev(div1, t3);
    			append_dev(div1, t4);
    			append_dev(div2, t5);
    			html_tag.m(div2);
    			append_dev(li, t6);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.list) && raw0_value !== (raw0_value = ctx.comment.author_name + "")) {
    				h3.innerHTML = raw0_value;
    			}

    			if ((changed.list) && t2_value !== (t2_value = moment(ctx.comment.date).format('MMM DD, YYYY') + "")) {
    				set_data_dev(t2, t2_value);
    			}

    			if ((changed.list) && t4_value !== (t4_value = moment(ctx.comment.date).format('HH:mm') + "")) {
    				set_data_dev(t4, t4_value);
    			}

    			if ((changed.list) && raw1_value !== (raw1_value = ctx.comment.content.rendered + "")) {
    				html_tag.p(raw1_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(li);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$1.name, type: "each", source: "(18:4) {#each list.reverse() as comment}", ctx });
    	return block;
    }

    function create_fragment$5(ctx) {
    	var if_block_anchor;

    	var if_block = (ctx.list && ctx.list.length > 0) && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (ctx.list && ctx.list.length > 0) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$5.name, type: "component", source: "", ctx });
    	return block;
    }

    let src = "";

    function instance$5($$self, $$props, $$invalidate) {
    	
      let list = [];
      let { id } = $$props;

      const apiUrl = "http://www.ganesankar.co.in/wp-json/wp/v2/comments?post=" + id;
      onMount(async function() {
        const response = await fetch(apiUrl);
        $$invalidate('list', list = await response.json());
      });

    	const writable_props = ['id'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Comments> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    	};

    	$$self.$capture_state = () => {
    		return { list, id, src };
    	};

    	$$self.$inject_state = $$props => {
    		if ('list' in $$props) $$invalidate('list', list = $$props.list);
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('src' in $$props) src = $$props.src;
    	};

    	return { list, id };
    }

    class Comments extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, ["id"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Comments", options, id: create_fragment$5.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<Comments> was created without expected prop 'id'");
    		}
    	}

    	get id() {
    		throw new Error("<Comments>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Comments>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\routes\Page.svelte generated by Svelte v3.12.1 */

    const file$4 = "src\\routes\\Page.svelte";

    // (25:0) {#if data.title}
    function create_if_block$4(ctx) {
    	var section0, div0, t0, div3, div2, div1, h1, t1, p, t2, a, t3, section1, div6, div5, div4, t4, div7, current;

    	var postimage = new PostImage({
    		props: {
    		size: "medium_large",
    		image: ctx.data.featured_media,
    		alt: ctx.data.title.rendered
    	},
    		$$inline: true
    	});

    	var if_block0 = (ctx.data.title) && create_if_block_2$1(ctx);

    	var if_block1 = (ctx.data.content) && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			section0 = element("section");
    			div0 = element("div");
    			postimage.$$.fragment.c();
    			t0 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			h1 = element("h1");
    			if (if_block0) if_block0.c();
    			t1 = space();
    			p = element("p");
    			t2 = space();
    			a = element("a");
    			t3 = space();
    			section1 = element("section");
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			if (if_block1) if_block1.c();
    			t4 = space();
    			div7 = element("div");
    			div7.textContent = " ";
    			attr_dev(div0, "class", "cover");
    			set_style(div0, "transform", "translateZ(0px) translateY(25.6286%)");
    			add_location(div0, file$4, 27, 2, 757);
    			add_location(h1, file$4, 36, 8, 1121);
    			attr_dev(p, "class", "lead");
    			add_location(p, file$4, 41, 8, 1231);
    			attr_dev(a, "href", "#next");
    			attr_dev(a, "class", "go-down js-smoothscroll");
    			add_location(a, file$4, 44, 8, 1280);
    			attr_dev(div1, "class", "col-md-10 aos-init aos-animate");
    			attr_dev(div1, "data-aos", "fade-up");
    			add_location(div1, file$4, 35, 6, 1049);
    			attr_dev(div2, "class", "row align-items-center justify-content-center intro");
    			add_location(div2, file$4, 34, 4, 977);
    			attr_dev(div3, "class", "container");
    			add_location(div3, file$4, 33, 2, 949);
    			attr_dev(section0, "class", "templateux-hero overlay");
    			attr_dev(section0, "data-scrollax-parent", "true");
    			add_location(section0, file$4, 26, 0, 685);
    			attr_dev(div4, "class", "col-md-12 clearfix mb-3");
    			add_location(div4, file$4, 54, 6, 1541);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$4, 53, 4, 1517);
    			attr_dev(div6, "class", "container py-5 aos-init aos-animate");
    			attr_dev(div6, "data-aos", "fade-up");
    			add_location(div6, file$4, 52, 2, 1444);
    			attr_dev(section1, "class", "templateux-section");
    			add_location(section1, file$4, 51, 0, 1405);
    			attr_dev(div7, "class", "clearfix mb-3");
    			add_location(div7, file$4, 63, 0, 1705);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section0, anchor);
    			append_dev(section0, div0);
    			mount_component(postimage, div0, null);
    			append_dev(section0, t0);
    			append_dev(section0, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h1);
    			if (if_block0) if_block0.m(h1, null);
    			append_dev(div1, t1);
    			append_dev(div1, p);
    			append_dev(div1, t2);
    			append_dev(div1, a);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, section1, anchor);
    			append_dev(section1, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			if (if_block1) if_block1.m(div4, null);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div7, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var postimage_changes = {};
    			if (changed.data) postimage_changes.image = ctx.data.featured_media;
    			if (changed.data) postimage_changes.alt = ctx.data.title.rendered;
    			postimage.$set(postimage_changes);

    			if (ctx.data.title) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    				} else {
    					if_block0 = create_if_block_2$1(ctx);
    					if_block0.c();
    					if_block0.m(h1, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (ctx.data.content) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    				} else {
    					if_block1 = create_if_block_1$2(ctx);
    					if_block1.c();
    					if_block1.m(div4, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(postimage.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(postimage.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section0);
    			}

    			destroy_component(postimage);

    			if (if_block0) if_block0.d();

    			if (detaching) {
    				detach_dev(t3);
    				detach_dev(section1);
    			}

    			if (if_block1) if_block1.d();

    			if (detaching) {
    				detach_dev(t4);
    				detach_dev(div7);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$4.name, type: "if", source: "(25:0) {#if data.title}", ctx });
    	return block;
    }

    // (38:10) {#if data.title}
    function create_if_block_2$1(ctx) {
    	var html_tag, raw_value = ctx.data.title.rendered + "";

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag(raw_value, null);
    		},

    		m: function mount(target, anchor) {
    			html_tag.m(target, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.data) && raw_value !== (raw_value = ctx.data.title.rendered + "")) {
    				html_tag.p(raw_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				html_tag.d();
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2$1.name, type: "if", source: "(38:10) {#if data.title}", ctx });
    	return block;
    }

    // (56:8) {#if data.content}
    function create_if_block_1$2(ctx) {
    	var html_tag, raw_value = ctx.data.content.rendered + "";

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag(raw_value, null);
    		},

    		m: function mount(target, anchor) {
    			html_tag.m(target, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.data) && raw_value !== (raw_value = ctx.data.content.rendered + "")) {
    				html_tag.p(raw_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				html_tag.d();
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$2.name, type: "if", source: "(56:8) {#if data.content}", ctx });
    	return block;
    }

    function create_fragment$6(ctx) {
    	var scrolling = false, clear_scrolling = () => { scrolling = false; }, scrolling_timeout, t, if_block_anchor, current, dispose;

    	add_render_callback(ctx.onwindowresize);

    	add_render_callback(ctx.onwindowscroll);

    	var if_block = (ctx.data.title) && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			document.title = "Home Page";

    			dispose = [
    				listen_dev(window, "resize", ctx.onwindowresize),
    				listen_dev(window, "scroll", () => {
    					scrolling = true;
    					clearTimeout(scrolling_timeout);
    					scrolling_timeout = setTimeout(clear_scrolling, 100);
    					ctx.onwindowscroll();
    				})
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.x && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window.pageXOffset, ctx.x);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			if (ctx.data.title) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}

    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$6.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	
      let { id } = $$props;
      let data = [];

      let y;
      let x;
      const apiUrl = "https://ganesankar.co.in/wp-json/wp/v2/pages?slug=" + id;
      onMount(async function() {
        const response = await fetch(apiUrl);
        const dataArr = await response.json();
        $$invalidate('data', data = dataArr[0]);
      });

    	const writable_props = ['id'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Page> was created with unknown prop '${key}'`);
    	});

    	function onwindowresize() {
    		y = window.innerHeight; $$invalidate('y', y);
    	}

    	function onwindowscroll() {
    		x = window.pageYOffset; $$invalidate('x', x);
    	}

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    	};

    	$$self.$capture_state = () => {
    		return { id, data, y, x };
    	};

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('data' in $$props) $$invalidate('data', data = $$props.data);
    		if ('y' in $$props) $$invalidate('y', y = $$props.y);
    		if ('x' in $$props) $$invalidate('x', x = $$props.x);
    	};

    	return {
    		id,
    		data,
    		y,
    		x,
    		onwindowresize,
    		onwindowscroll
    	};
    }

    class Page extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, ["id"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Page", options, id: create_fragment$6.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<Page> was created without expected prop 'id'");
    		}
    	}

    	get id() {
    		throw new Error("<Page>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Page>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\routes\Blog.svelte generated by Svelte v3.12.1 */

    const file$5 = "src\\routes\\Blog.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.post = list[i];
    	return child_ctx;
    }

    // (46:6) {#if posts && posts.length > 0}
    function create_if_block_2$2(ctx) {
    	var each_1_anchor, current;

    	let each_value = ctx.posts;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.posts || changed.moment) {
    				each_value = ctx.posts;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach_dev(each_1_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2$2.name, type: "if", source: "(46:6) {#if posts && posts.length > 0}", ctx });
    	return block;
    }

    // (66:20) {#if post.date}
    function create_if_block_3$1(ctx) {
    	var t_value = moment(ctx.post.date).format('MMM DD, YYYY') + "", t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.posts) && t_value !== (t_value = moment(ctx.post.date).format('MMM DD, YYYY') + "")) {
    				set_data_dev(t, t_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3$1.name, type: "if", source: "(66:20) {#if post.date}", ctx });
    	return block;
    }

    // (50:12) <Link               to={`post/${post.slug}`}               css="post animsition-link aos-init"               href="blog-single.html">
    function create_default_slot_2(ctx) {
    	var figure, t0, div1, div0, h2, raw_value = ctx.post.title.rendered + "", t1, span, current;

    	var postimage = new PostImage({
    		props: {
    		size: "medium_large",
    		image: ctx.post.featured_media,
    		alt: ctx.post.title.rendered
    	},
    		$$inline: true
    	});

    	var if_block = (ctx.post.date) && create_if_block_3$1(ctx);

    	const block = {
    		c: function create() {
    			figure = element("figure");
    			postimage.$$.fragment.c();
    			t0 = space();
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			t1 = space();
    			span = element("span");
    			if (if_block) if_block.c();
    			add_location(figure, file$5, 53, 14, 1741);
    			add_location(h2, file$5, 61, 18, 2042);
    			add_location(span, file$5, 64, 18, 2137);
    			attr_dev(div0, "class", "project-hover-inner");
    			add_location(div0, file$5, 60, 16, 1990);
    			attr_dev(div1, "class", "project-hover");
    			add_location(div1, file$5, 59, 14, 1946);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, figure, anchor);
    			mount_component(postimage, figure, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			h2.innerHTML = raw_value;
    			append_dev(div0, t1);
    			append_dev(div0, span);
    			if (if_block) if_block.m(span, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var postimage_changes = {};
    			if (changed.posts) postimage_changes.image = ctx.post.featured_media;
    			if (changed.posts) postimage_changes.alt = ctx.post.title.rendered;
    			postimage.$set(postimage_changes);

    			if ((!current || changed.posts) && raw_value !== (raw_value = ctx.post.title.rendered + "")) {
    				h2.innerHTML = raw_value;
    			}

    			if (ctx.post.date) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_3$1(ctx);
    					if_block.c();
    					if_block.m(span, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(postimage.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(postimage.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(figure);
    			}

    			destroy_component(postimage);

    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(div1);
    			}

    			if (if_block) if_block.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_2.name, type: "slot", source: "(50:12) <Link               to={`post/${post.slug}`}               css=\"post animsition-link aos-init\"               href=\"blog-single.html\">", ctx });
    	return block;
    }

    // (47:8) {#each posts as post}
    function create_each_block$2(ctx) {
    	var div, t, current;

    	var link = new Link({
    		props: {
    		to: `post/${ctx.post.slug}`,
    		css: "post animsition-link aos-init",
    		href: "blog-single.html",
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			div = element("div");
    			link.$$.fragment.c();
    			t = space();
    			attr_dev(div, "class", "col-md-6 aos-init aos-animate");
    			attr_dev(div, "data-aos", "fade-up");
    			attr_dev(div, "data-aos-delay", "200");
    			add_location(div, file$5, 47, 10, 1487);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(link, div, null);
    			append_dev(div, t);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.posts) link_changes.to = `post/${ctx.post.slug}`;
    			if (changed.$$scope || changed.posts) link_changes.$$scope = { changed, ctx };
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_component(link);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$2.name, type: "each", source: "(47:8) {#each posts as post}", ctx });
    	return block;
    }

    // (91:14) {:else}
    function create_else_block_1(ctx) {
    	var a;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "Previous";
    			attr_dev(a, "class", "button button--red");
    			attr_dev(a, "href", "#");
    			attr_dev(a, "disabled", "");
    			add_location(a, file$5, 91, 16, 3014);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block_1.name, type: "else", source: "(91:14) {:else}", ctx });
    	return block;
    }

    // (87:16) {#if pagination > 0 }
    function create_if_block_1$3(ctx) {
    	var current;

    	var link = new Link({
    		props: {
    		to: `blog/${ Number(ctx.pagination) === 2 ? '' : Number(ctx.pagination) - 1}`,
    		css: "page-link",
    		$$slots: { default: [create_default_slot_1$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			link.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(link, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.$$scope) link_changes.$$scope = { changed, ctx };
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(link, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$3.name, type: "if", source: "(87:16) {#if pagination > 0 }", ctx });
    	return block;
    }

    // (88:16) <Link to={`blog/${ Number(pagination) === 2 ? '' : Number(pagination) - 1}`} css="page-link">
    function create_default_slot_1$1(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Previous");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1$1.name, type: "slot", source: "(88:16) <Link to={`blog/${ Number(pagination) === 2 ? '' : Number(pagination) - 1}`} css=\"page-link\">", ctx });
    	return block;
    }

    // (102:16) {:else}
    function create_else_block$2(ctx) {
    	var a;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "Next";
    			attr_dev(a, "class", "page-link");
    			attr_dev(a, "href", "#");
    			attr_dev(a, "disabled", "");
    			add_location(a, file$5, 102, 18, 3365);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$2.name, type: "else", source: "(102:16) {:else}", ctx });
    	return block;
    }

    // (98:16) {#if pagination > 0 }
    function create_if_block$5(ctx) {
    	var current;

    	var link = new Link({
    		props: {
    		to: `blog/${ Number(ctx.pagination) + 1}`,
    		css: "page-link",
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			link.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(link, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.$$scope) link_changes.$$scope = { changed, ctx };
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(link, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$5.name, type: "if", source: "(98:16) {#if pagination > 0 }", ctx });
    	return block;
    }

    // (99:18) <Link to={`blog/${ Number(pagination) + 1}`} css="page-link">
    function create_default_slot$1(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Next");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$1.name, type: "slot", source: "(99:18) <Link to={`blog/${ Number(pagination) + 1}`} css=\"page-link\">", ctx });
    	return block;
    }

    function create_fragment$7(ctx) {
    	var scrolling = false, clear_scrolling = () => { scrolling = false; }, scrolling_timeout, t0, section0, div2, div1, div0, h1, t2, p, t4, a, t5, section1, div6, div5, t6, div4, div3, nav, ul, li0, current_block_type_index, if_block1, t7, li1, current_block_type_index_1, if_block2, current, dispose;

    	add_render_callback(ctx.onwindowresize);

    	add_render_callback(ctx.onwindowscroll);

    	var if_block0 = (ctx.posts && ctx.posts.length > 0) && create_if_block_2$2(ctx);

    	var if_block_creators = [
    		create_if_block_1$3,
    		create_else_block_1
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.pagination > 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	var if_block_creators_1 = [
    		create_if_block$5,
    		create_else_block$2
    	];

    	var if_blocks_1 = [];

    	function select_block_type_1(changed, ctx) {
    		if (ctx.pagination > 0) return 0;
    		return 1;
    	}

    	current_block_type_index_1 = select_block_type_1(null, ctx);
    	if_block2 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);

    	const block = {
    		c: function create() {
    			t0 = space();
    			section0 = element("section");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "My Blog";
    			t2 = space();
    			p = element("p");
    			p.textContent = "Just another WordPress site";
    			t4 = space();
    			a = element("a");
    			t5 = space();
    			section1 = element("section");
    			div6 = element("div");
    			div5 = element("div");
    			if (if_block0) if_block0.c();
    			t6 = space();
    			div4 = element("div");
    			div3 = element("div");
    			nav = element("nav");
    			ul = element("ul");
    			li0 = element("li");
    			if_block1.c();
    			t7 = space();
    			li1 = element("li");
    			if_block2.c();
    			document.title = "Blog Page";
    			add_location(h1, file$5, 33, 8, 1097);
    			attr_dev(p, "class", "lead");
    			add_location(p, file$5, 34, 8, 1122);
    			attr_dev(a, "href", "#next");
    			attr_dev(a, "class", "go-down js-smoothscroll");
    			add_location(a, file$5, 37, 8, 1198);
    			attr_dev(div0, "class", "col-md-10 aos-init aos-animate");
    			attr_dev(div0, "data-aos", "fade-up");
    			add_location(div0, file$5, 32, 6, 1025);
    			attr_dev(div1, "class", "row align-items-center justify-content-center intro");
    			add_location(div1, file$5, 31, 4, 953);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$5, 30, 2, 925);
    			attr_dev(section0, "class", "templateux-hero");
    			attr_dev(section0, "data-scrollax-parent", "true");
    			add_location(section0, file$5, 28, 0, 743);
    			attr_dev(li0, "class", "page-item");
    			add_location(li0, file$5, 85, 14, 2754);
    			attr_dev(li1, "class", "page-item");
    			add_location(li1, file$5, 95, 14, 3130);
    			attr_dev(ul, "class", "pagination");
    			add_location(ul, file$5, 84, 12, 2716);
    			attr_dev(nav, "aria-label", "Page navigation example");
    			add_location(nav, file$5, 83, 10, 2661);
    			attr_dev(div3, "class", "col-md-12 text-center");
    			add_location(div3, file$5, 80, 8, 2529);
    			attr_dev(div4, "class", "row pt-5 aos-init aos-animate");
    			attr_dev(div4, "data-aos", "fade-up");
    			attr_dev(div4, "data-aos-delay", "100");
    			add_location(div4, file$5, 76, 6, 2413);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$5, 44, 4, 1391);
    			attr_dev(div6, "class", "container-fluid");
    			add_location(div6, file$5, 43, 2, 1357);
    			attr_dev(section1, "class", "templateux-portfolio-overlap mb-5");
    			attr_dev(section1, "id", "next");
    			add_location(section1, file$5, 42, 0, 1293);

    			dispose = [
    				listen_dev(window, "resize", ctx.onwindowresize),
    				listen_dev(window, "scroll", () => {
    					scrolling = true;
    					clearTimeout(scrolling_timeout);
    					scrolling_timeout = setTimeout(clear_scrolling, 100);
    					ctx.onwindowscroll();
    				})
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, section0, anchor);
    			append_dev(section0, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t2);
    			append_dev(div0, p);
    			append_dev(div0, t4);
    			append_dev(div0, a);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, section1, anchor);
    			append_dev(section1, div6);
    			append_dev(div6, div5);
    			if (if_block0) if_block0.m(div5, null);
    			append_dev(div5, t6);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, nav);
    			append_dev(nav, ul);
    			append_dev(ul, li0);
    			if_blocks[current_block_type_index].m(li0, null);
    			append_dev(ul, t7);
    			append_dev(ul, li1);
    			if_blocks_1[current_block_type_index_1].m(li1, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.x && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window.pageXOffset, ctx.x);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			if (ctx.posts && ctx.posts.length > 0) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_2$2(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div5, t6);
    				}
    			} else if (if_block0) {
    				group_outros();
    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});
    				check_outros();
    			}

    			if_block1.p(changed, ctx);
    			if_block2.p(changed, ctx);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(section0);
    				detach_dev(t5);
    				detach_dev(section1);
    			}

    			if (if_block0) if_block0.d();
    			if_blocks[current_block_type_index].d();
    			if_blocks_1[current_block_type_index_1].d();
    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$7.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	
      let { location } = $$props;
      let { page } = $$props;
      let posts = [];
      let y;
      let x;
      let pagination = page || 1;
      const postApiUrl = `https://ganesankar.co.in/wp-json/wp/v2/posts?per_page=10&page=${pagination}`;
      onMount(async function() {
        const postresponse = await fetch(postApiUrl);
        const postsall = await postresponse.json();
        $$invalidate('posts', posts = postsall);
      });

    	const writable_props = ['location', 'page'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Blog> was created with unknown prop '${key}'`);
    	});

    	function onwindowresize() {
    		y = window.innerHeight; $$invalidate('y', y);
    	}

    	function onwindowscroll() {
    		x = window.pageYOffset; $$invalidate('x', x);
    	}

    	$$self.$set = $$props => {
    		if ('location' in $$props) $$invalidate('location', location = $$props.location);
    		if ('page' in $$props) $$invalidate('page', page = $$props.page);
    	};

    	$$self.$capture_state = () => {
    		return { location, page, posts, y, x, pagination };
    	};

    	$$self.$inject_state = $$props => {
    		if ('location' in $$props) $$invalidate('location', location = $$props.location);
    		if ('page' in $$props) $$invalidate('page', page = $$props.page);
    		if ('posts' in $$props) $$invalidate('posts', posts = $$props.posts);
    		if ('y' in $$props) $$invalidate('y', y = $$props.y);
    		if ('x' in $$props) $$invalidate('x', x = $$props.x);
    		if ('pagination' in $$props) $$invalidate('pagination', pagination = $$props.pagination);
    	};

    	$$self.$$.update = ($$dirty = { location: 1 }) => {
    		if ($$dirty.location) { $$invalidate('location', location); }
    	};

    	return {
    		location,
    		page,
    		posts,
    		y,
    		x,
    		pagination,
    		onwindowresize,
    		onwindowscroll
    	};
    }

    class Blog extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, ["location", "page"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Blog", options, id: create_fragment$7.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.location === undefined && !('location' in props)) {
    			console.warn("<Blog> was created without expected prop 'location'");
    		}
    		if (ctx.page === undefined && !('page' in props)) {
    			console.warn("<Blog> was created without expected prop 'page'");
    		}
    	}

    	get location() {
    		throw new Error("<Blog>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set location(value) {
    		throw new Error("<Blog>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get page() {
    		throw new Error("<Blog>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set page(value) {
    		throw new Error("<Blog>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\common\Util.svelte generated by Svelte v3.12.1 */

    function fromArray(a, b, c, d) {
      let i = a.findIndex((o) => o[b] == c);
      if (i > -1) {
        return a[i][d];
      }
      return undefined;
    }

    /* src\routes\Category.svelte generated by Svelte v3.12.1 */

    const file$6 = "src\\routes\\Category.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.post = list[i];
    	return child_ctx;
    }

    // (53:6) {#if posts && posts.length > 0}
    function create_if_block_2$3(ctx) {
    	var each_1_anchor, current;

    	let each_value = ctx.posts;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.posts || changed.moment) {
    				each_value = ctx.posts;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach_dev(each_1_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2$3.name, type: "if", source: "(53:6) {#if posts && posts.length > 0}", ctx });
    	return block;
    }

    // (75:20) {#if post.date}
    function create_if_block_3$2(ctx) {
    	var t_value = moment(ctx.post.date).format('MMM DD, YYYY') + "", t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.posts) && t_value !== (t_value = moment(ctx.post.date).format('MMM DD, YYYY') + "")) {
    				set_data_dev(t, t_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3$2.name, type: "if", source: "(75:20) {#if post.date}", ctx });
    	return block;
    }

    // (59:12) <Link               to={`post/${post.slug}`}               css="post animsition-link aos-init"               href="blog-single.html">
    function create_default_slot_2$1(ctx) {
    	var figure, t0, div1, div0, h2, raw_value = ctx.post.title.rendered + "", t1, span, current;

    	var postimage = new PostImage({
    		props: {
    		size: "medium_large",
    		image: ctx.post.featured_media,
    		alt: ctx.post.title.rendered
    	},
    		$$inline: true
    	});

    	var if_block = (ctx.post.date) && create_if_block_3$2(ctx);

    	const block = {
    		c: function create() {
    			figure = element("figure");
    			postimage.$$.fragment.c();
    			t0 = space();
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			t1 = space();
    			span = element("span");
    			if (if_block) if_block.c();
    			add_location(figure, file$6, 62, 14, 2167);
    			add_location(h2, file$6, 70, 18, 2468);
    			add_location(span, file$6, 73, 18, 2563);
    			attr_dev(div0, "class", "project-hover-inner");
    			add_location(div0, file$6, 69, 16, 2416);
    			attr_dev(div1, "class", "project-hover");
    			add_location(div1, file$6, 68, 14, 2372);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, figure, anchor);
    			mount_component(postimage, figure, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			h2.innerHTML = raw_value;
    			append_dev(div0, t1);
    			append_dev(div0, span);
    			if (if_block) if_block.m(span, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var postimage_changes = {};
    			if (changed.posts) postimage_changes.image = ctx.post.featured_media;
    			if (changed.posts) postimage_changes.alt = ctx.post.title.rendered;
    			postimage.$set(postimage_changes);

    			if ((!current || changed.posts) && raw_value !== (raw_value = ctx.post.title.rendered + "")) {
    				h2.innerHTML = raw_value;
    			}

    			if (ctx.post.date) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_3$2(ctx);
    					if_block.c();
    					if_block.m(span, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(postimage.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(postimage.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(figure);
    			}

    			destroy_component(postimage);

    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(div1);
    			}

    			if (if_block) if_block.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_2$1.name, type: "slot", source: "(59:12) <Link               to={`post/${post.slug}`}               css=\"post animsition-link aos-init\"               href=\"blog-single.html\">", ctx });
    	return block;
    }

    // (54:8) {#each posts as post}
    function create_each_block$3(ctx) {
    	var div, t, current;

    	var link = new Link({
    		props: {
    		to: `post/${ctx.post.slug}`,
    		css: "post animsition-link aos-init",
    		href: "blog-single.html",
    		$$slots: { default: [create_default_slot_2$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			div = element("div");
    			link.$$.fragment.c();
    			t = space();
    			attr_dev(div, "class", "col-md-6 aos-init aos-animate");
    			attr_dev(div, "data-aos", "fade-up");
    			attr_dev(div, "data-aos-delay", "200");
    			add_location(div, file$6, 54, 10, 1887);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(link, div, null);
    			append_dev(div, t);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.posts) link_changes.to = `post/${ctx.post.slug}`;
    			if (changed.$$scope || changed.posts) link_changes.$$scope = { changed, ctx };
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_component(link);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$3.name, type: "each", source: "(54:8) {#each posts as post}", ctx });
    	return block;
    }

    // (103:16) {:else}
    function create_else_block_1$1(ctx) {
    	var a;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "Previous";
    			attr_dev(a, "class", "button button--red");
    			attr_dev(a, "href", "#");
    			attr_dev(a, "disabled", "");
    			add_location(a, file$6, 103, 18, 3520);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block_1$1.name, type: "else", source: "(103:16) {:else}", ctx });
    	return block;
    }

    // (97:16) {#if pagination > 0}
    function create_if_block_1$4(ctx) {
    	var current;

    	var link = new Link({
    		props: {
    		to: `blog/${Number(ctx.pagination) === 2 ? '' : Number(ctx.pagination) - 1}`,
    		css: "page-link",
    		$$slots: { default: [create_default_slot_1$2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			link.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(link, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.$$scope) link_changes.$$scope = { changed, ctx };
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(link, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$4.name, type: "if", source: "(97:16) {#if pagination > 0}", ctx });
    	return block;
    }

    // (98:18) <Link                     to={`blog/${Number(pagination) === 2 ? '' : Number(pagination) - 1}`}                     css="page-link">
    function create_default_slot_1$2(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Previous");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1$2.name, type: "slot", source: "(98:18) <Link                     to={`blog/${Number(pagination) === 2 ? '' : Number(pagination) - 1}`}                     css=\"page-link\">", ctx });
    	return block;
    }

    // (114:16) {:else}
    function create_else_block$3(ctx) {
    	var a;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "Next";
    			attr_dev(a, "class", "page-link");
    			attr_dev(a, "href", "#");
    			attr_dev(a, "disabled", "");
    			add_location(a, file$6, 114, 18, 3871);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$3.name, type: "else", source: "(114:16) {:else}", ctx });
    	return block;
    }

    // (110:16) {#if pagination > 0}
    function create_if_block$6(ctx) {
    	var current;

    	var link = new Link({
    		props: {
    		to: `blog/${Number(ctx.pagination) + 1}`,
    		css: "page-link",
    		$$slots: { default: [create_default_slot$2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			link.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(link, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.$$scope) link_changes.$$scope = { changed, ctx };
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(link, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$6.name, type: "if", source: "(110:16) {#if pagination > 0}", ctx });
    	return block;
    }

    // (111:18) <Link to={`blog/${Number(pagination) + 1}`} css="page-link">
    function create_default_slot$2(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Next");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$2.name, type: "slot", source: "(111:18) <Link to={`blog/${Number(pagination) + 1}`} css=\"page-link\">", ctx });
    	return block;
    }

    function create_fragment$8(ctx) {
    	var scrolling = false, clear_scrolling = () => { scrolling = false; }, scrolling_timeout, t0, section0, div2, div1, div0, h1, t1, t2, t3, p, t5, a, t6, section1, div7, div6, t7, div3, t8, div5, div4, nav, ul, li0, current_block_type_index, if_block1, t9, li1, current_block_type_index_1, if_block2, current, dispose;

    	add_render_callback(ctx.onwindowresize);

    	add_render_callback(ctx.onwindowscroll);

    	var if_block0 = (ctx.posts && ctx.posts.length > 0) && create_if_block_2$3(ctx);

    	var if_block_creators = [
    		create_if_block_1$4,
    		create_else_block_1$1
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.pagination > 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	var if_block_creators_1 = [
    		create_if_block$6,
    		create_else_block$3
    	];

    	var if_blocks_1 = [];

    	function select_block_type_1(changed, ctx) {
    		if (ctx.pagination > 0) return 0;
    		return 1;
    	}

    	current_block_type_index_1 = select_block_type_1(null, ctx);
    	if_block2 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);

    	const block = {
    		c: function create() {
    			t0 = space();
    			section0 = element("section");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			t1 = text("Category : ");
    			t2 = text(ctx.pageTitle);
    			t3 = space();
    			p = element("p");
    			p.textContent = "Just another WordPress site";
    			t5 = space();
    			a = element("a");
    			t6 = space();
    			section1 = element("section");
    			div7 = element("div");
    			div6 = element("div");
    			if (if_block0) if_block0.c();
    			t7 = space();
    			div3 = element("div");
    			t8 = space();
    			div5 = element("div");
    			div4 = element("div");
    			nav = element("nav");
    			ul = element("ul");
    			li0 = element("li");
    			if_block1.c();
    			t9 = space();
    			li1 = element("li");
    			if_block2.c();
    			document.title = "Blog Page";
    			add_location(h1, file$6, 42, 8, 1502);
    			attr_dev(p, "class", "lead");
    			add_location(p, file$6, 43, 8, 1542);
    			attr_dev(a, "href", "#next");
    			attr_dev(a, "class", "go-down js-smoothscroll");
    			add_location(a, file$6, 44, 8, 1598);
    			attr_dev(div0, "class", "col-md-10 aos-init aos-animate");
    			attr_dev(div0, "data-aos", "fade-up");
    			add_location(div0, file$6, 41, 6, 1430);
    			attr_dev(div1, "class", "row align-items-center justify-content-center intro");
    			add_location(div1, file$6, 40, 4, 1358);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$6, 39, 2, 1330);
    			attr_dev(section0, "class", "templateux-hero");
    			attr_dev(section0, "data-scrollax-parent", "true");
    			add_location(section0, file$6, 37, 0, 1148);
    			attr_dev(div3, "class", "clearfix");
    			add_location(div3, file$6, 85, 6, 2839);
    			attr_dev(li0, "class", "page-item");
    			add_location(li0, file$6, 95, 14, 3212);
    			attr_dev(li1, "class", "page-item");
    			add_location(li1, file$6, 107, 14, 3638);
    			attr_dev(ul, "class", "pagination");
    			add_location(ul, file$6, 94, 12, 3174);
    			attr_dev(nav, "aria-label", "Page navigation example");
    			add_location(nav, file$6, 93, 10, 3119);
    			attr_dev(div4, "class", "col-md-12 text-center");
    			add_location(div4, file$6, 90, 8, 2986);
    			attr_dev(div5, "class", "row pt-5 aos-init aos-animate");
    			attr_dev(div5, "data-aos", "fade-up");
    			attr_dev(div5, "data-aos-delay", "100");
    			add_location(div5, file$6, 86, 6, 2870);
    			attr_dev(div6, "class", "row");
    			add_location(div6, file$6, 51, 4, 1791);
    			attr_dev(div7, "class", "container-fluid");
    			add_location(div7, file$6, 50, 2, 1757);
    			attr_dev(section1, "class", "templateux-portfolio-overlap mb-5");
    			attr_dev(section1, "id", "next");
    			add_location(section1, file$6, 49, 0, 1693);

    			dispose = [
    				listen_dev(window, "resize", ctx.onwindowresize),
    				listen_dev(window, "scroll", () => {
    					scrolling = true;
    					clearTimeout(scrolling_timeout);
    					scrolling_timeout = setTimeout(clear_scrolling, 100);
    					ctx.onwindowscroll();
    				})
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, section0, anchor);
    			append_dev(section0, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    			append_dev(div0, t3);
    			append_dev(div0, p);
    			append_dev(div0, t5);
    			append_dev(div0, a);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, section1, anchor);
    			append_dev(section1, div7);
    			append_dev(div7, div6);
    			if (if_block0) if_block0.m(div6, null);
    			append_dev(div6, t7);
    			append_dev(div6, div3);
    			append_dev(div6, t8);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, nav);
    			append_dev(nav, ul);
    			append_dev(ul, li0);
    			if_blocks[current_block_type_index].m(li0, null);
    			append_dev(ul, t9);
    			append_dev(ul, li1);
    			if_blocks_1[current_block_type_index_1].m(li1, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.x && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window.pageXOffset, ctx.x);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			if (!current || changed.pageTitle) {
    				set_data_dev(t2, ctx.pageTitle);
    			}

    			if (ctx.posts && ctx.posts.length > 0) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_2$3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div6, t7);
    				}
    			} else if (if_block0) {
    				group_outros();
    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});
    				check_outros();
    			}

    			if_block1.p(changed, ctx);
    			if_block2.p(changed, ctx);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(section0);
    				detach_dev(t6);
    				detach_dev(section1);
    			}

    			if (if_block0) if_block0.d();
    			if_blocks[current_block_type_index].d();
    			if_blocks_1[current_block_type_index_1].d();
    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$8.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	
      let { location } = $$props;
      let { page, category } = $$props;
      let posts = [];
      let y;
      let x;
      let pagination = page || 1;
      let categories;
      let pageTitle = "";
      onMount(async function() {
        const unsubscribe = categoryList.subscribe((value) => {
          categories = value;
        });
        if (categories && category) {
          const id = fromArray(categories, "slug", category, "id");
          $$invalidate('pageTitle', pageTitle = fromArray(categories, "slug", category, "name"));
          const postApiUrl = `https://ganesankar.co.in/wp-json/wp/v2/posts?categories=${id}&per_page=10&page=${pagination}`;
          const postresponse = await fetch(postApiUrl);
          const postsall = await postresponse.json();
          $$invalidate('posts', posts = postsall);
        }
      });

    	const writable_props = ['location', 'page', 'category'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Category> was created with unknown prop '${key}'`);
    	});

    	function onwindowresize() {
    		y = window.innerHeight; $$invalidate('y', y);
    	}

    	function onwindowscroll() {
    		x = window.pageYOffset; $$invalidate('x', x);
    	}

    	$$self.$set = $$props => {
    		if ('location' in $$props) $$invalidate('location', location = $$props.location);
    		if ('page' in $$props) $$invalidate('page', page = $$props.page);
    		if ('category' in $$props) $$invalidate('category', category = $$props.category);
    	};

    	$$self.$capture_state = () => {
    		return { location, page, category, posts, y, x, pagination, categories, pageTitle };
    	};

    	$$self.$inject_state = $$props => {
    		if ('location' in $$props) $$invalidate('location', location = $$props.location);
    		if ('page' in $$props) $$invalidate('page', page = $$props.page);
    		if ('category' in $$props) $$invalidate('category', category = $$props.category);
    		if ('posts' in $$props) $$invalidate('posts', posts = $$props.posts);
    		if ('y' in $$props) $$invalidate('y', y = $$props.y);
    		if ('x' in $$props) $$invalidate('x', x = $$props.x);
    		if ('pagination' in $$props) $$invalidate('pagination', pagination = $$props.pagination);
    		if ('categories' in $$props) categories = $$props.categories;
    		if ('pageTitle' in $$props) $$invalidate('pageTitle', pageTitle = $$props.pageTitle);
    	};

    	$$self.$$.update = ($$dirty = { location: 1 }) => {
    		if ($$dirty.location) { $$invalidate('location', location); }
    	};

    	return {
    		location,
    		page,
    		category,
    		posts,
    		y,
    		x,
    		pagination,
    		pageTitle,
    		onwindowresize,
    		onwindowscroll
    	};
    }

    class Category extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, ["location", "page", "category"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Category", options, id: create_fragment$8.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.location === undefined && !('location' in props)) {
    			console.warn("<Category> was created without expected prop 'location'");
    		}
    		if (ctx.page === undefined && !('page' in props)) {
    			console.warn("<Category> was created without expected prop 'page'");
    		}
    		if (ctx.category === undefined && !('category' in props)) {
    			console.warn("<Category> was created without expected prop 'category'");
    		}
    	}

    	get location() {
    		throw new Error("<Category>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set location(value) {
    		throw new Error("<Category>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get page() {
    		throw new Error("<Category>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set page(value) {
    		throw new Error("<Category>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get category() {
    		throw new Error("<Category>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set category(value) {
    		throw new Error("<Category>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\routes\Tag.svelte generated by Svelte v3.12.1 */

    const file$7 = "src\\routes\\Tag.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.post = list[i];
    	return child_ctx;
    }

    // (53:8) {#if posts && posts.length > 0}
    function create_if_block_2$4(ctx) {
    	var each_1_anchor, current;

    	let each_value = ctx.posts;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.posts || changed.moment) {
    				each_value = ctx.posts;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach_dev(each_1_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2$4.name, type: "if", source: "(53:8) {#if posts && posts.length > 0}", ctx });
    	return block;
    }

    // (75:22) {#if post.date}
    function create_if_block_3$3(ctx) {
    	var t_value = moment(ctx.post.date).format('MMM DD, YYYY') + "", t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.posts) && t_value !== (t_value = moment(ctx.post.date).format('MMM DD, YYYY') + "")) {
    				set_data_dev(t, t_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3$3.name, type: "if", source: "(75:22) {#if post.date}", ctx });
    	return block;
    }

    // (59:14) <Link                 to={`post/${post.slug}`}                 css="post animsition-link aos-init"                 href="blog-single.html">
    function create_default_slot_2$2(ctx) {
    	var figure, t0, div1, div0, h2, raw_value = ctx.post.title.rendered + "", t1, span, current;

    	var postimage = new PostImage({
    		props: {
    		size: "medium_large",
    		image: ctx.post.featured_media,
    		alt: ctx.post.title.rendered
    	},
    		$$inline: true
    	});

    	var if_block = (ctx.post.date) && create_if_block_3$3(ctx);

    	const block = {
    		c: function create() {
    			figure = element("figure");
    			postimage.$$.fragment.c();
    			t0 = space();
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			t1 = space();
    			span = element("span");
    			if (if_block) if_block.c();
    			add_location(figure, file$7, 62, 16, 2252);
    			add_location(h2, file$7, 70, 20, 2569);
    			add_location(span, file$7, 73, 20, 2670);
    			attr_dev(div0, "class", "project-hover-inner");
    			add_location(div0, file$7, 69, 18, 2515);
    			attr_dev(div1, "class", "project-hover");
    			add_location(div1, file$7, 68, 16, 2469);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, figure, anchor);
    			mount_component(postimage, figure, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			h2.innerHTML = raw_value;
    			append_dev(div0, t1);
    			append_dev(div0, span);
    			if (if_block) if_block.m(span, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var postimage_changes = {};
    			if (changed.posts) postimage_changes.image = ctx.post.featured_media;
    			if (changed.posts) postimage_changes.alt = ctx.post.title.rendered;
    			postimage.$set(postimage_changes);

    			if ((!current || changed.posts) && raw_value !== (raw_value = ctx.post.title.rendered + "")) {
    				h2.innerHTML = raw_value;
    			}

    			if (ctx.post.date) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_3$3(ctx);
    					if_block.c();
    					if_block.m(span, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(postimage.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(postimage.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(figure);
    			}

    			destroy_component(postimage);

    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(div1);
    			}

    			if (if_block) if_block.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_2$2.name, type: "slot", source: "(59:14) <Link                 to={`post/${post.slug}`}                 css=\"post animsition-link aos-init\"                 href=\"blog-single.html\">", ctx });
    	return block;
    }

    // (54:10) {#each posts as post}
    function create_each_block$4(ctx) {
    	var div, t, current;

    	var link = new Link({
    		props: {
    		to: `post/${ctx.post.slug}`,
    		css: "post animsition-link aos-init",
    		href: "blog-single.html",
    		$$slots: { default: [create_default_slot_2$2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			div = element("div");
    			link.$$.fragment.c();
    			t = space();
    			attr_dev(div, "class", "col-md-6 aos-init aos-animate");
    			attr_dev(div, "data-aos", "fade-up");
    			attr_dev(div, "data-aos-delay", "200");
    			add_location(div, file$7, 54, 12, 1956);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(link, div, null);
    			append_dev(div, t);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.posts) link_changes.to = `post/${ctx.post.slug}`;
    			if (changed.$$scope || changed.posts) link_changes.$$scope = { changed, ctx };
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_component(link);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$4.name, type: "each", source: "(54:10) {#each posts as post}", ctx });
    	return block;
    }

    // (103:18) {:else}
    function create_else_block_1$2(ctx) {
    	var a;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "Previous";
    			attr_dev(a, "class", "button button--red");
    			attr_dev(a, "href", "#");
    			attr_dev(a, "disabled", "");
    			add_location(a, file$7, 103, 20, 3687);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block_1$2.name, type: "else", source: "(103:18) {:else}", ctx });
    	return block;
    }

    // (97:18) {#if pagination > 0}
    function create_if_block_1$5(ctx) {
    	var current;

    	var link = new Link({
    		props: {
    		to: `blog/${Number(ctx.pagination) === 2 ? '' : Number(ctx.pagination) - 1}`,
    		css: "page-link",
    		$$slots: { default: [create_default_slot_1$3] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			link.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(link, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.$$scope) link_changes.$$scope = { changed, ctx };
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(link, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$5.name, type: "if", source: "(97:18) {#if pagination > 0}", ctx });
    	return block;
    }

    // (98:20) <Link                       to={`blog/${Number(pagination) === 2 ? '' : Number(pagination) - 1}`}                       css="page-link">
    function create_default_slot_1$3(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Previous");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1$3.name, type: "slot", source: "(98:20) <Link                       to={`blog/${Number(pagination) === 2 ? '' : Number(pagination) - 1}`}                       css=\"page-link\">", ctx });
    	return block;
    }

    // (114:18) {:else}
    function create_else_block$4(ctx) {
    	var a;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "Next";
    			attr_dev(a, "class", "page-link");
    			attr_dev(a, "href", "#");
    			attr_dev(a, "disabled", "");
    			add_location(a, file$7, 114, 20, 4060);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$4.name, type: "else", source: "(114:18) {:else}", ctx });
    	return block;
    }

    // (110:18) {#if pagination > 0}
    function create_if_block$7(ctx) {
    	var current;

    	var link = new Link({
    		props: {
    		to: `blog/${Number(ctx.pagination) + 1}`,
    		css: "page-link",
    		$$slots: { default: [create_default_slot$3] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			link.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(link, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.$$scope) link_changes.$$scope = { changed, ctx };
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(link, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$7.name, type: "if", source: "(110:18) {#if pagination > 0}", ctx });
    	return block;
    }

    // (111:20) <Link to={`blog/${Number(pagination) + 1}`} css="page-link">
    function create_default_slot$3(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Next");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$3.name, type: "slot", source: "(111:20) <Link to={`blog/${Number(pagination) + 1}`} css=\"page-link\">", ctx });
    	return block;
    }

    function create_fragment$9(ctx) {
    	var scrolling = false, clear_scrolling = () => { scrolling = false; }, scrolling_timeout, t0, section0, div2, div1, div0, h1, t1, t2, t3, p, t5, a, t6, section1, div7, div6, t7, div3, t8, div5, div4, nav, ul, li0, current_block_type_index, if_block1, t9, li1, current_block_type_index_1, if_block2, current, dispose;

    	add_render_callback(ctx.onwindowresize);

    	add_render_callback(ctx.onwindowscroll);

    	var if_block0 = (ctx.posts && ctx.posts.length > 0) && create_if_block_2$4(ctx);

    	var if_block_creators = [
    		create_if_block_1$5,
    		create_else_block_1$2
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.pagination > 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	var if_block_creators_1 = [
    		create_if_block$7,
    		create_else_block$4
    	];

    	var if_blocks_1 = [];

    	function select_block_type_1(changed, ctx) {
    		if (ctx.pagination > 0) return 0;
    		return 1;
    	}

    	current_block_type_index_1 = select_block_type_1(null, ctx);
    	if_block2 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);

    	const block = {
    		c: function create() {
    			t0 = space();
    			section0 = element("section");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			t1 = text("Tag : ");
    			t2 = text(ctx.pageTitle);
    			t3 = space();
    			p = element("p");
    			p.textContent = "Just another WordPress site";
    			t5 = space();
    			a = element("a");
    			t6 = space();
    			section1 = element("section");
    			div7 = element("div");
    			div6 = element("div");
    			if (if_block0) if_block0.c();
    			t7 = space();
    			div3 = element("div");
    			t8 = space();
    			div5 = element("div");
    			div4 = element("div");
    			nav = element("nav");
    			ul = element("ul");
    			li0 = element("li");
    			if_block1.c();
    			t9 = space();
    			li1 = element("li");
    			if_block2.c();
    			document.title = "Blog Page";
    			add_location(h1, file$7, 42, 10, 1552);
    			attr_dev(p, "class", "lead");
    			add_location(p, file$7, 43, 10, 1589);
    			attr_dev(a, "href", "#next");
    			attr_dev(a, "class", "go-down js-smoothscroll");
    			add_location(a, file$7, 44, 10, 1647);
    			attr_dev(div0, "class", "col-md-10 aos-init aos-animate");
    			attr_dev(div0, "data-aos", "fade-up");
    			add_location(div0, file$7, 41, 8, 1478);
    			attr_dev(div1, "class", "row align-items-center justify-content-center intro");
    			add_location(div1, file$7, 40, 6, 1404);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$7, 39, 4, 1374);
    			attr_dev(section0, "class", "templateux-hero");
    			attr_dev(section0, "data-scrollax-parent", "true");
    			add_location(section0, file$7, 37, 2, 1188);
    			attr_dev(div3, "class", "clearfix");
    			add_location(div3, file$7, 85, 8, 2970);
    			attr_dev(li0, "class", "page-item");
    			add_location(li0, file$7, 95, 16, 3363);
    			attr_dev(li1, "class", "page-item");
    			add_location(li1, file$7, 107, 16, 3813);
    			attr_dev(ul, "class", "pagination");
    			add_location(ul, file$7, 94, 14, 3323);
    			attr_dev(nav, "aria-label", "Page navigation example");
    			add_location(nav, file$7, 93, 12, 3266);
    			attr_dev(div4, "class", "col-md-12 text-center");
    			add_location(div4, file$7, 90, 10, 3127);
    			attr_dev(div5, "class", "row pt-5 aos-init aos-animate");
    			attr_dev(div5, "data-aos", "fade-up");
    			attr_dev(div5, "data-aos-delay", "100");
    			add_location(div5, file$7, 86, 8, 3003);
    			attr_dev(div6, "class", "row");
    			add_location(div6, file$7, 51, 6, 1854);
    			attr_dev(div7, "class", "container-fluid");
    			add_location(div7, file$7, 50, 4, 1818);
    			attr_dev(section1, "class", "templateux-portfolio-overlap mb-5");
    			attr_dev(section1, "id", "next");
    			add_location(section1, file$7, 49, 2, 1752);

    			dispose = [
    				listen_dev(window, "resize", ctx.onwindowresize),
    				listen_dev(window, "scroll", () => {
    					scrolling = true;
    					clearTimeout(scrolling_timeout);
    					scrolling_timeout = setTimeout(clear_scrolling, 100);
    					ctx.onwindowscroll();
    				})
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, section0, anchor);
    			append_dev(section0, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    			append_dev(div0, t3);
    			append_dev(div0, p);
    			append_dev(div0, t5);
    			append_dev(div0, a);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, section1, anchor);
    			append_dev(section1, div7);
    			append_dev(div7, div6);
    			if (if_block0) if_block0.m(div6, null);
    			append_dev(div6, t7);
    			append_dev(div6, div3);
    			append_dev(div6, t8);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, nav);
    			append_dev(nav, ul);
    			append_dev(ul, li0);
    			if_blocks[current_block_type_index].m(li0, null);
    			append_dev(ul, t9);
    			append_dev(ul, li1);
    			if_blocks_1[current_block_type_index_1].m(li1, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.x && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window.pageXOffset, ctx.x);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			if (!current || changed.pageTitle) {
    				set_data_dev(t2, ctx.pageTitle);
    			}

    			if (ctx.posts && ctx.posts.length > 0) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_2$4(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div6, t7);
    				}
    			} else if (if_block0) {
    				group_outros();
    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});
    				check_outros();
    			}

    			if_block1.p(changed, ctx);
    			if_block2.p(changed, ctx);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(section0);
    				detach_dev(t6);
    				detach_dev(section1);
    			}

    			if (if_block0) if_block0.d();
    			if_blocks[current_block_type_index].d();
    			if_blocks_1[current_block_type_index_1].d();
    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$9.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	
        let { location } = $$props;
        let { page, tag } = $$props;
        let posts = [];
        let y;
        let x;
        let pagination = page || 1;
        let categories;
        let pageTitle = '';
        onMount(async function() {
          const unsubscribe = tagsList.subscribe((value) => {
            categories = value;
          });
          if (categories && tag) {
            const id = fromArray(categories, "slug", tag, "id");
            $$invalidate('pageTitle', pageTitle = fromArray(categories, "slug", tag, "name"));
            const postApiUrl = `https://ganesankar.co.in/wp-json/wp/v2/posts?tags=${id}&per_page=10&page=${pagination}`;
            const postresponse = await fetch(postApiUrl);
            const postsall = await postresponse.json();
            $$invalidate('posts', posts = postsall);
          }
        });

    	const writable_props = ['location', 'page', 'tag'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Tag> was created with unknown prop '${key}'`);
    	});

    	function onwindowresize() {
    		y = window.innerHeight; $$invalidate('y', y);
    	}

    	function onwindowscroll() {
    		x = window.pageYOffset; $$invalidate('x', x);
    	}

    	$$self.$set = $$props => {
    		if ('location' in $$props) $$invalidate('location', location = $$props.location);
    		if ('page' in $$props) $$invalidate('page', page = $$props.page);
    		if ('tag' in $$props) $$invalidate('tag', tag = $$props.tag);
    	};

    	$$self.$capture_state = () => {
    		return { location, page, tag, posts, y, x, pagination, categories, pageTitle };
    	};

    	$$self.$inject_state = $$props => {
    		if ('location' in $$props) $$invalidate('location', location = $$props.location);
    		if ('page' in $$props) $$invalidate('page', page = $$props.page);
    		if ('tag' in $$props) $$invalidate('tag', tag = $$props.tag);
    		if ('posts' in $$props) $$invalidate('posts', posts = $$props.posts);
    		if ('y' in $$props) $$invalidate('y', y = $$props.y);
    		if ('x' in $$props) $$invalidate('x', x = $$props.x);
    		if ('pagination' in $$props) $$invalidate('pagination', pagination = $$props.pagination);
    		if ('categories' in $$props) categories = $$props.categories;
    		if ('pageTitle' in $$props) $$invalidate('pageTitle', pageTitle = $$props.pageTitle);
    	};

    	$$self.$$.update = ($$dirty = { location: 1 }) => {
    		if ($$dirty.location) { $$invalidate('location', location); }
    	};

    	return {
    		location,
    		page,
    		tag,
    		posts,
    		y,
    		x,
    		pagination,
    		pageTitle,
    		onwindowresize,
    		onwindowscroll
    	};
    }

    class Tag extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, ["location", "page", "tag"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Tag", options, id: create_fragment$9.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.location === undefined && !('location' in props)) {
    			console.warn("<Tag> was created without expected prop 'location'");
    		}
    		if (ctx.page === undefined && !('page' in props)) {
    			console.warn("<Tag> was created without expected prop 'page'");
    		}
    		if (ctx.tag === undefined && !('tag' in props)) {
    			console.warn("<Tag> was created without expected prop 'tag'");
    		}
    	}

    	get location() {
    		throw new Error("<Tag>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set location(value) {
    		throw new Error("<Tag>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get page() {
    		throw new Error("<Tag>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set page(value) {
    		throw new Error("<Tag>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tag() {
    		throw new Error("<Tag>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tag(value) {
    		throw new Error("<Tag>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\common\AuthorName.svelte generated by Svelte v3.12.1 */

    const file$8 = "src\\common\\AuthorName.svelte";

    function create_fragment$a(ctx) {
    	var span, t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(ctx.name);
    			add_location(span, file$8, 16, 0, 349);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},

    		p: function update(changed, ctx) {
    			if (changed.name) {
    				set_data_dev(t, ctx.name);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(span);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$a.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { author } = $$props;
      let name = "";
      let allUsers;
      const unsubscribe = userList.subscribe((value) => {
        allUsers = value;
      });
      if (allUsers && allUsers.length > 0) {
        let obj = allUsers.find((o) => o.id === author);
        if (obj && obj.name) {
          $$invalidate('name', name = obj.name);
        }
      }

    	const writable_props = ['author'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<AuthorName> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('author' in $$props) $$invalidate('author', author = $$props.author);
    	};

    	$$self.$capture_state = () => {
    		return { author, name, allUsers };
    	};

    	$$self.$inject_state = $$props => {
    		if ('author' in $$props) $$invalidate('author', author = $$props.author);
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('allUsers' in $$props) allUsers = $$props.allUsers;
    	};

    	return { author, name };
    }

    class AuthorName extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, ["author"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "AuthorName", options, id: create_fragment$a.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.author === undefined && !('author' in props)) {
    			console.warn("<AuthorName> was created without expected prop 'author'");
    		}
    	}

    	get author() {
    		throw new Error("<AuthorName>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set author(value) {
    		throw new Error("<AuthorName>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\routes\Post.svelte generated by Svelte v3.12.1 */
    const { console: console_1 } = globals;

    const file$9 = "src\\routes\\Post.svelte";

    function get_each_context$5(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.tag = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.category = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.tag = list[i];
    	return child_ctx;
    }

    // (37:0) {#if data.title}
    function create_if_block$8(ctx) {
    	var section0, div3, div2, div1, div0, span0, t0, t1_value = moment(ctx.data.date).format('MMM DD, YYYY') + "", t1, t2, span1, t4, span2, t5, t6, h1, t7, a, t8, section1, div14, div13, div12, div6, p, img, t9, t10, div4, t11, div5, t12, div11, div8, form, div7, span3, t13, input, t14, div10, div9, h3, t16, t17, current;

    	var authorname = new AuthorName({
    		props: { author: ctx.data.author },
    		$$inline: true
    	});

    	var if_block0 = (ctx.data.title) && create_if_block_7(ctx);

    	var if_block1 = (ctx.data.content) && create_if_block_6(ctx);

    	var if_block2 = (ctx.tags && ctx.data.tags && ctx.data.tags.length > 0) && create_if_block_4(ctx);

    	var if_block3 = (ctx.data.title) && create_if_block_3$4(ctx);

    	var if_block4 = (ctx.categories && ctx.categories.length > 0) && create_if_block_2$5(ctx);

    	var if_block5 = (ctx.tags && ctx.tags.length > 0) && create_if_block_1$6(ctx);

    	const block = {
    		c: function create() {
    			section0 = element("section");
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			t0 = text("Posted in ");
    			t1 = text(t1_value);
    			t2 = space();
    			span1 = element("span");
    			span1.textContent = "•";
    			t4 = space();
    			span2 = element("span");
    			t5 = text("Posted by\n              ");
    			authorname.$$.fragment.c();
    			t6 = space();
    			h1 = element("h1");
    			if (if_block0) if_block0.c();
    			t7 = space();
    			a = element("a");
    			t8 = space();
    			section1 = element("section");
    			div14 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			div6 = element("div");
    			p = element("p");
    			img = element("img");
    			t9 = space();
    			if (if_block1) if_block1.c();
    			t10 = space();
    			div4 = element("div");
    			if (if_block2) if_block2.c();
    			t11 = space();
    			div5 = element("div");
    			if (if_block3) if_block3.c();
    			t12 = space();
    			div11 = element("div");
    			div8 = element("div");
    			form = element("form");
    			div7 = element("div");
    			span3 = element("span");
    			t13 = space();
    			input = element("input");
    			t14 = space();
    			div10 = element("div");
    			div9 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Categories";
    			t16 = space();
    			if (if_block4) if_block4.c();
    			t17 = space();
    			if (if_block5) if_block5.c();
    			add_location(span0, file$9, 43, 12, 1381);
    			attr_dev(span1, "class", "sep");
    			add_location(span1, file$9, 44, 12, 1459);
    			add_location(span2, file$9, 45, 12, 1498);
    			attr_dev(div0, "class", "post-meta");
    			add_location(div0, file$9, 42, 10, 1345);
    			add_location(h1, file$9, 50, 10, 1626);
    			attr_dev(a, "href", "#next");
    			attr_dev(a, "class", "go-down js-smoothscroll");
    			add_location(a, file$9, 55, 10, 1746);
    			attr_dev(div1, "class", "col-md-12 aos-init aos-animate");
    			attr_dev(div1, "data-aos", "fade-up");
    			add_location(div1, file$9, 41, 8, 1271);
    			attr_dev(div2, "class", "row align-items-center justify-content-center intro");
    			add_location(div2, file$9, 40, 6, 1197);
    			attr_dev(div3, "class", "container");
    			add_location(div3, file$9, 39, 4, 1167);
    			attr_dev(section0, "class", "templateux-hero");
    			attr_dev(section0, "data-scrollax-parent", "true");
    			add_location(section0, file$9, 37, 2, 981);
    			attr_dev(img, "src", "images/img_1.jpg");
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "img-fluid");
    			attr_dev(img, "data-pagespeed-url-hash", "2601062986");
    			attr_dev(img, "onload", "pagespeed.CriticalImages.checkImageForCriticality(this);");
    			add_location(img, file$9, 68, 14, 2088);
    			attr_dev(p, "class", "mb-5");
    			add_location(p, file$9, 66, 12, 2056);
    			attr_dev(div4, "class", "tag-widget post-tag-container mb-5 mt-5");
    			add_location(div4, file$9, 78, 12, 2449);
    			attr_dev(div5, "class", "pt-5 mt-5");
    			add_location(div5, file$9, 94, 12, 3074);
    			attr_dev(div6, "class", "col-md-8");
    			add_location(div6, file$9, 65, 10, 2021);
    			attr_dev(span3, "class", "icon fa fa-search");
    			add_location(span3, file$9, 108, 18, 3496);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "form-control");
    			attr_dev(input, "placeholder", "Type a keyword and hit enter");
    			add_location(input, file$9, 109, 18, 3549);
    			attr_dev(div7, "class", "form-group");
    			add_location(div7, file$9, 107, 16, 3453);
    			attr_dev(form, "action", "#");
    			attr_dev(form, "class", "search-form");
    			add_location(form, file$9, 106, 14, 3399);
    			attr_dev(div8, "class", "sidebar-box");
    			add_location(div8, file$9, 105, 12, 3359);
    			add_location(h3, file$9, 118, 16, 3852);
    			attr_dev(div9, "class", "categories");
    			add_location(div9, file$9, 117, 14, 3811);
    			attr_dev(div10, "class", "sidebar-box");
    			add_location(div10, file$9, 116, 12, 3771);
    			attr_dev(div11, "class", "col-md-4 sidebar pl-md-5");
    			add_location(div11, file$9, 104, 10, 3308);
    			attr_dev(div12, "class", "row");
    			add_location(div12, file$9, 64, 8, 1993);
    			attr_dev(div13, "class", "container");
    			add_location(div13, file$9, 63, 6, 1961);
    			attr_dev(div14, "id", "blog");
    			attr_dev(div14, "class", "site-section");
    			add_location(div14, file$9, 62, 4, 1918);
    			attr_dev(section1, "class", "templateux-portfolio-overlap mb-5");
    			attr_dev(section1, "id", "next");
    			add_location(section1, file$9, 61, 2, 1852);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section0, anchor);
    			append_dev(section0, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, span0);
    			append_dev(span0, t0);
    			append_dev(span0, t1);
    			append_dev(div0, t2);
    			append_dev(div0, span1);
    			append_dev(div0, t4);
    			append_dev(div0, span2);
    			append_dev(span2, t5);
    			mount_component(authorname, span2, null);
    			append_dev(div1, t6);
    			append_dev(div1, h1);
    			if (if_block0) if_block0.m(h1, null);
    			append_dev(div1, t7);
    			append_dev(div1, a);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, section1, anchor);
    			append_dev(section1, div14);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div6);
    			append_dev(div6, p);
    			append_dev(p, img);
    			append_dev(div6, t9);
    			if (if_block1) if_block1.m(div6, null);
    			append_dev(div6, t10);
    			append_dev(div6, div4);
    			if (if_block2) if_block2.m(div4, null);
    			append_dev(div6, t11);
    			append_dev(div6, div5);
    			if (if_block3) if_block3.m(div5, null);
    			append_dev(div12, t12);
    			append_dev(div12, div11);
    			append_dev(div11, div8);
    			append_dev(div8, form);
    			append_dev(form, div7);
    			append_dev(div7, span3);
    			append_dev(div7, t13);
    			append_dev(div7, input);
    			append_dev(div11, t14);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, h3);
    			append_dev(div9, t16);
    			if (if_block4) if_block4.m(div9, null);
    			append_dev(div11, t17);
    			if (if_block5) if_block5.m(div11, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.data) && t1_value !== (t1_value = moment(ctx.data.date).format('MMM DD, YYYY') + "")) {
    				set_data_dev(t1, t1_value);
    			}

    			var authorname_changes = {};
    			if (changed.data) authorname_changes.author = ctx.data.author;
    			authorname.$set(authorname_changes);

    			if (ctx.data.title) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    				} else {
    					if_block0 = create_if_block_7(ctx);
    					if_block0.c();
    					if_block0.m(h1, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (ctx.data.content) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    				} else {
    					if_block1 = create_if_block_6(ctx);
    					if_block1.c();
    					if_block1.m(div6, t10);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (ctx.tags && ctx.data.tags && ctx.data.tags.length > 0) {
    				if (if_block2) {
    					if_block2.p(changed, ctx);
    					transition_in(if_block2, 1);
    				} else {
    					if_block2 = create_if_block_4(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div4, null);
    				}
    			} else if (if_block2) {
    				group_outros();
    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});
    				check_outros();
    			}

    			if (ctx.data.title) {
    				if (if_block3) {
    					if_block3.p(changed, ctx);
    					transition_in(if_block3, 1);
    				} else {
    					if_block3 = create_if_block_3$4(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(div5, null);
    				}
    			} else if (if_block3) {
    				group_outros();
    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});
    				check_outros();
    			}

    			if (ctx.categories && ctx.categories.length > 0) {
    				if (if_block4) {
    					if_block4.p(changed, ctx);
    					transition_in(if_block4, 1);
    				} else {
    					if_block4 = create_if_block_2$5(ctx);
    					if_block4.c();
    					transition_in(if_block4, 1);
    					if_block4.m(div9, null);
    				}
    			} else if (if_block4) {
    				group_outros();
    				transition_out(if_block4, 1, 1, () => {
    					if_block4 = null;
    				});
    				check_outros();
    			}

    			if (ctx.tags && ctx.tags.length > 0) {
    				if (if_block5) {
    					if_block5.p(changed, ctx);
    					transition_in(if_block5, 1);
    				} else {
    					if_block5 = create_if_block_1$6(ctx);
    					if_block5.c();
    					transition_in(if_block5, 1);
    					if_block5.m(div11, null);
    				}
    			} else if (if_block5) {
    				group_outros();
    				transition_out(if_block5, 1, 1, () => {
    					if_block5 = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(authorname.$$.fragment, local);

    			transition_in(if_block2);
    			transition_in(if_block3);
    			transition_in(if_block4);
    			transition_in(if_block5);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(authorname.$$.fragment, local);
    			transition_out(if_block2);
    			transition_out(if_block3);
    			transition_out(if_block4);
    			transition_out(if_block5);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section0);
    			}

    			destroy_component(authorname);

    			if (if_block0) if_block0.d();

    			if (detaching) {
    				detach_dev(t8);
    				detach_dev(section1);
    			}

    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$8.name, type: "if", source: "(37:0) {#if data.title}", ctx });
    	return block;
    }

    // (52:12) {#if data.title}
    function create_if_block_7(ctx) {
    	var html_tag, raw_value = ctx.data.title.rendered + "";

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag(raw_value, null);
    		},

    		m: function mount(target, anchor) {
    			html_tag.m(target, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.data) && raw_value !== (raw_value = ctx.data.title.rendered + "")) {
    				html_tag.p(raw_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				html_tag.d();
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_7.name, type: "if", source: "(52:12) {#if data.title}", ctx });
    	return block;
    }

    // (76:12) {#if data.content}
    function create_if_block_6(ctx) {
    	var html_tag, raw_value = ctx.data.content.rendered + "";

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag(raw_value, null);
    		},

    		m: function mount(target, anchor) {
    			html_tag.m(target, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.data) && raw_value !== (raw_value = ctx.data.content.rendered + "")) {
    				html_tag.p(raw_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				html_tag.d();
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_6.name, type: "if", source: "(76:12) {#if data.content}", ctx });
    	return block;
    }

    // (80:14) {#if tags && data.tags && data.tags.length > 0}
    function create_if_block_4(ctx) {
    	var div, current;

    	let each_value_2 = ctx.data.tags;

    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(div, "class", "tagcloud");
    			add_location(div, file$9, 80, 16, 2581);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.fromArray || changed.tags || changed.data) {
    				each_value_2 = ctx.data.tags;

    				let i;
    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();
    				for (i = each_value_2.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_4.name, type: "if", source: "(80:14) {#if tags && data.tags && data.tags.length > 0}", ctx });
    	return block;
    }

    // (84:20) {#if fromArray(tags, 'id', tag, 'name')}
    function create_if_block_5(ctx) {
    	var current;

    	var link = new Link({
    		props: {
    		to: `tags/${fromArray(ctx.tags, 'id', ctx.tag, 'slug')}`,
    		css: "tag-cloud-link",
    		$$slots: { default: [create_default_slot_2$3] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			link.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(link, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.tags || changed.data) link_changes.to = `tags/${fromArray(ctx.tags, 'id', ctx.tag, 'slug')}`;
    			if (changed.$$scope || changed.tags || changed.data) link_changes.$$scope = { changed, ctx };
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(link, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_5.name, type: "if", source: "(84:20) {#if fromArray(tags, 'id', tag, 'name')}", ctx });
    	return block;
    }

    // (85:22) <Link                         to={`tags/${fromArray(tags, 'id', tag, 'slug')}`}                         css="tag-cloud-link">
    function create_default_slot_2$3(ctx) {
    	var t0_value = fromArray(ctx.tags, 'id', ctx.tag, 'name') + "", t0, t1;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.tags || changed.data) && t0_value !== (t0_value = fromArray(ctx.tags, 'id', ctx.tag, 'name') + "")) {
    				set_data_dev(t0, t0_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(t1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_2$3.name, type: "slot", source: "(85:22) <Link                         to={`tags/${fromArray(tags, 'id', tag, 'slug')}`}                         css=\"tag-cloud-link\">", ctx });
    	return block;
    }

    // (83:18) {#each data.tags as tag}
    function create_each_block_2(ctx) {
    	var show_if = fromArray(ctx.tags, 'id', ctx.tag, 'name'), if_block_anchor, current;

    	var if_block = (show_if) && create_if_block_5(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.tags || changed.data) show_if = fromArray(ctx.tags, 'id', ctx.tag, 'name');

    			if (show_if) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_5(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_2.name, type: "each", source: "(83:18) {#each data.tags as tag}", ctx });
    	return block;
    }

    // (96:14) {#if data.title}
    function create_if_block_3$4(ctx) {
    	var current;

    	var comments = new Comments({
    		props: { id: ctx.data.id },
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			comments.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(comments, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var comments_changes = {};
    			if (changed.data) comments_changes.id = ctx.data.id;
    			comments.$set(comments_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(comments.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(comments.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(comments, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3$4.name, type: "if", source: "(96:14) {#if data.title}", ctx });
    	return block;
    }

    // (121:16) {#if categories && categories.length > 0}
    function create_if_block_2$5(ctx) {
    	var each_1_anchor, current;

    	let each_value_1 = ctx.categories;

    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.categories) {
    				each_value_1 = ctx.categories;

    				let i;
    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();
    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach_dev(each_1_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2$5.name, type: "if", source: "(121:16) {#if categories && categories.length > 0}", ctx });
    	return block;
    }

    // (124:22) <Link to={`category/${category.slug}`}>
    function create_default_slot_1$4(ctx) {
    	var t_value = ctx.category.name + "", t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.categories) && t_value !== (t_value = ctx.category.name + "")) {
    				set_data_dev(t, t_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1$4.name, type: "slot", source: "(124:22) <Link to={`category/${category.slug}`}>", ctx });
    	return block;
    }

    // (122:18) {#each categories as category}
    function create_each_block_1$1(ctx) {
    	var li, t, current;

    	var link = new Link({
    		props: {
    		to: `category/${ctx.category.slug}`,
    		$$slots: { default: [create_default_slot_1$4] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			li = element("li");
    			link.$$.fragment.c();
    			t = space();
    			add_location(li, file$9, 122, 20, 4000);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(link, li, null);
    			append_dev(li, t);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.categories) link_changes.to = `category/${ctx.category.slug}`;
    			if (changed.$$scope || changed.categories) link_changes.$$scope = { changed, ctx };
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(li);
    			}

    			destroy_component(link);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_1$1.name, type: "each", source: "(122:18) {#each categories as category}", ctx });
    	return block;
    }

    // (134:12) {#if tags && tags.length > 0}
    function create_if_block_1$6(ctx) {
    	var div1, h3, t_1, div0, current;

    	let each_value = ctx.tags;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Tag Cloud";
    			t_1 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			add_location(h3, file$9, 135, 16, 4351);
    			attr_dev(div0, "class", "tagcloud");
    			add_location(div0, file$9, 136, 16, 4386);
    			attr_dev(div1, "class", "sidebar-box");
    			add_location(div1, file$9, 134, 14, 4309);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h3);
    			append_dev(div1, t_1);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.tags) {
    				each_value = ctx.tags;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$5(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$5(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div0, null);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div1);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$6.name, type: "if", source: "(134:12) {#if tags && tags.length > 0}", ctx });
    	return block;
    }

    // (140:20) <Link to={`tags/${tag.slug}`} css="tag-cloud-link">
    function create_default_slot$4(ctx) {
    	var t0_value = ctx.tag.name + "", t0, t1;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.tags) && t0_value !== (t0_value = ctx.tag.name + "")) {
    				set_data_dev(t0, t0_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(t1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$4.name, type: "slot", source: "(140:20) <Link to={`tags/${tag.slug}`} css=\"tag-cloud-link\">", ctx });
    	return block;
    }

    // (139:18) {#each tags as tag}
    function create_each_block$5(ctx) {
    	var current;

    	var link = new Link({
    		props: {
    		to: `tags/${ctx.tag.slug}`,
    		css: "tag-cloud-link",
    		$$slots: { default: [create_default_slot$4] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			link.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(link, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.tags) link_changes.to = `tags/${ctx.tag.slug}`;
    			if (changed.$$scope || changed.tags) link_changes.$$scope = { changed, ctx };
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(link, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$5.name, type: "each", source: "(139:18) {#each tags as tag}", ctx });
    	return block;
    }

    function create_fragment$b(ctx) {
    	var scrolling = false, clear_scrolling = () => { scrolling = false; }, scrolling_timeout, t, if_block_anchor, current, dispose;

    	add_render_callback(ctx.onwindowresize);

    	add_render_callback(ctx.onwindowscroll);

    	var if_block = (ctx.data.title) && create_if_block$8(ctx);

    	const block = {
    		c: function create() {
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			document.title = "Home Page";

    			dispose = [
    				listen_dev(window, "resize", ctx.onwindowresize),
    				listen_dev(window, "scroll", () => {
    					scrolling = true;
    					clearTimeout(scrolling_timeout);
    					scrolling_timeout = setTimeout(clear_scrolling, 100);
    					ctx.onwindowscroll();
    				})
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.x && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window.pageXOffset, ctx.x);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			if (ctx.data.title) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$8(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}

    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$b.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	
      let { id } = $$props;
      let data = [];

      let y;
      let x;
      let categories;
      let tags;
      const apiUrl = "https://ganesankar.co.in/wp-json/wp/v2/posts?slug=" + id;
      onMount(async function() {
        const unsubscribe = categoryList.subscribe((value) => {
          $$invalidate('categories', categories = value);
        });
        const p = tagsList.subscribe((value) => {
          $$invalidate('tags', tags = value);
        });

        console.log(tags);
        const response = await fetch(apiUrl);
        const dataArr = await response.json();
        $$invalidate('data', data = dataArr[0]);
      });

    	const writable_props = ['id'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console_1.warn(`<Post> was created with unknown prop '${key}'`);
    	});

    	function onwindowresize() {
    		y = window.innerHeight; $$invalidate('y', y);
    	}

    	function onwindowscroll() {
    		x = window.pageYOffset; $$invalidate('x', x);
    	}

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    	};

    	$$self.$capture_state = () => {
    		return { id, data, y, x, categories, tags };
    	};

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('data' in $$props) $$invalidate('data', data = $$props.data);
    		if ('y' in $$props) $$invalidate('y', y = $$props.y);
    		if ('x' in $$props) $$invalidate('x', x = $$props.x);
    		if ('categories' in $$props) $$invalidate('categories', categories = $$props.categories);
    		if ('tags' in $$props) $$invalidate('tags', tags = $$props.tags);
    	};

    	return {
    		id,
    		data,
    		y,
    		x,
    		categories,
    		tags,
    		onwindowresize,
    		onwindowscroll
    	};
    }

    class Post extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, ["id"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Post", options, id: create_fragment$b.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.id === undefined && !('id' in props)) {
    			console_1.warn("<Post> was created without expected prop 'id'");
    		}
    	}

    	get id() {
    		throw new Error("<Post>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Post>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\routes\Portfolio.svelte generated by Svelte v3.12.1 */

    const file$a = "src\\routes\\Portfolio.svelte";

    // (39:12) {#if data.title}
    function create_if_block_2$6(ctx) {
    	var html_tag, raw_value = ctx.data.title.rendered + "";

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag(raw_value, null);
    		},

    		m: function mount(target, anchor) {
    			html_tag.m(target, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.data) && raw_value !== (raw_value = ctx.data.title.rendered + "")) {
    				html_tag.p(raw_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				html_tag.d();
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2$6.name, type: "if", source: "(39:12) {#if data.title}", ctx });
    	return block;
    }

    // (63:12) {#if data.content}
    function create_if_block_1$7(ctx) {
    	var html_tag, raw_value = ctx.data.content.rendered + "";

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag(raw_value, null);
    		},

    		m: function mount(target, anchor) {
    			html_tag.m(target, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.data) && raw_value !== (raw_value = ctx.data.content.rendered + "")) {
    				html_tag.p(raw_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				html_tag.d();
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$7.name, type: "if", source: "(63:12) {#if data.content}", ctx });
    	return block;
    }

    // (75:14) {#if data.title}
    function create_if_block$9(ctx) {
    	var current;

    	var comments = new Comments({
    		props: { id: ctx.data.id },
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			comments.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(comments, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var comments_changes = {};
    			if (changed.data) comments_changes.id = ctx.data.id;
    			comments.$set(comments_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(comments.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(comments.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(comments, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$9.name, type: "if", source: "(75:14) {#if data.title}", ctx });
    	return block;
    }

    function create_fragment$c(ctx) {
    	var scrolling = false, clear_scrolling = () => { scrolling = false; }, scrolling_timeout, t0, section0, div3, div2, div1, div0, span0, t2, span1, t4, span2, t6, h1, t7, a0, t8, section1, div10, div9, div8, div7, p, img, t9, t10, div5, div4, a1, t12, a2, t14, a3, t16, a4, t18, div6, t19, section2, current, dispose;

    	add_render_callback(ctx.onwindowresize);

    	add_render_callback(ctx.onwindowscroll);

    	var if_block0 = (ctx.data.title) && create_if_block_2$6(ctx);

    	var if_block1 = (ctx.data.content) && create_if_block_1$7(ctx);

    	var if_block2 = (ctx.data.title) && create_if_block$9(ctx);

    	const block = {
    		c: function create() {
    			t0 = space();
    			section0 = element("section");
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "Posted in July 2, 2018";
    			t2 = space();
    			span1 = element("span");
    			span1.textContent = "•";
    			t4 = space();
    			span2 = element("span");
    			span2.textContent = "Posted by Josh Archibald";
    			t6 = space();
    			h1 = element("h1");
    			if (if_block0) if_block0.c();
    			t7 = space();
    			a0 = element("a");
    			t8 = space();
    			section1 = element("section");
    			div10 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			p = element("p");
    			img = element("img");
    			t9 = space();
    			if (if_block1) if_block1.c();
    			t10 = space();
    			div5 = element("div");
    			div4 = element("div");
    			a1 = element("a");
    			a1.textContent = "Work";
    			t12 = space();
    			a2 = element("a");
    			a2.textContent = "Bag";
    			t14 = space();
    			a3 = element("a");
    			a3.textContent = "Design";
    			t16 = space();
    			a4 = element("a");
    			a4.textContent = "Creative";
    			t18 = space();
    			div6 = element("div");
    			if (if_block2) if_block2.c();
    			t19 = space();
    			section2 = element("section");
    			document.title = "Home Page";
    			add_location(span0, file$a, 33, 12, 1088);
    			attr_dev(span1, "class", "sep");
    			add_location(span1, file$a, 34, 12, 1136);
    			add_location(span2, file$a, 35, 12, 1175);
    			attr_dev(div0, "class", "post-meta");
    			add_location(div0, file$a, 32, 10, 1052);
    			add_location(h1, file$a, 37, 10, 1240);
    			attr_dev(a0, "href", "#next");
    			attr_dev(a0, "class", "go-down js-smoothscroll");
    			add_location(a0, file$a, 42, 10, 1360);
    			attr_dev(div1, "class", "col-md-12 aos-init aos-animate");
    			attr_dev(div1, "data-aos", "fade-up");
    			add_location(div1, file$a, 31, 8, 978);
    			attr_dev(div2, "class", "row align-items-center justify-content-center intro");
    			add_location(div2, file$a, 30, 6, 904);
    			attr_dev(div3, "class", "container");
    			add_location(div3, file$a, 29, 4, 874);
    			attr_dev(section0, "class", "templateux-hero");
    			attr_dev(section0, "data-scrollax-parent", "true");
    			add_location(section0, file$a, 27, 2, 688);
    			attr_dev(img, "src", "images/img_1.jpg");
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "img-fluid");
    			attr_dev(img, "data-pagespeed-url-hash", "2601062986");
    			attr_dev(img, "onload", "pagespeed.CriticalImages.checkImageForCriticality(this);");
    			add_location(img, file$a, 55, 14, 1707);
    			attr_dev(p, "class", "mb-5");
    			add_location(p, file$a, 53, 12, 1673);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "tag-cloud-link");
    			add_location(a1, file$a, 67, 16, 2175);
    			attr_dev(a2, "href", "#");
    			attr_dev(a2, "class", "tag-cloud-link");
    			add_location(a2, file$a, 68, 16, 2235);
    			attr_dev(a3, "href", "#");
    			attr_dev(a3, "class", "tag-cloud-link");
    			add_location(a3, file$a, 69, 16, 2294);
    			attr_dev(a4, "href", "#");
    			attr_dev(a4, "class", "tag-cloud-link");
    			add_location(a4, file$a, 70, 16, 2356);
    			attr_dev(div4, "class", "tagcloud");
    			add_location(div4, file$a, 66, 14, 2136);
    			attr_dev(div5, "class", "tag-widget post-tag-container mb-5 mt-5");
    			add_location(div5, file$a, 65, 12, 2068);
    			attr_dev(div6, "class", "pt-5 mt-5");
    			add_location(div6, file$a, 73, 12, 2456);
    			attr_dev(div7, "class", "col-md-12");
    			add_location(div7, file$a, 52, 10, 1637);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file$a, 51, 8, 1609);
    			attr_dev(div9, "class", "container");
    			add_location(div9, file$a, 50, 6, 1577);
    			attr_dev(div10, "id", "blog");
    			attr_dev(div10, "class", "site-section");
    			add_location(div10, file$a, 49, 4, 1534);
    			attr_dev(section1, "class", "templateux-portfolio-overlap mb-5");
    			attr_dev(section1, "id", "next");
    			add_location(section1, file$a, 48, 2, 1468);
    			attr_dev(section2, "class", "letter");
    			add_location(section2, file$a, 88, 2, 2743);

    			dispose = [
    				listen_dev(window, "resize", ctx.onwindowresize),
    				listen_dev(window, "scroll", () => {
    					scrolling = true;
    					clearTimeout(scrolling_timeout);
    					scrolling_timeout = setTimeout(clear_scrolling, 100);
    					ctx.onwindowscroll();
    				})
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, section0, anchor);
    			append_dev(section0, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, span0);
    			append_dev(div0, t2);
    			append_dev(div0, span1);
    			append_dev(div0, t4);
    			append_dev(div0, span2);
    			append_dev(div1, t6);
    			append_dev(div1, h1);
    			if (if_block0) if_block0.m(h1, null);
    			append_dev(div1, t7);
    			append_dev(div1, a0);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, section1, anchor);
    			append_dev(section1, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, p);
    			append_dev(p, img);
    			append_dev(div7, t9);
    			if (if_block1) if_block1.m(div7, null);
    			append_dev(div7, t10);
    			append_dev(div7, div5);
    			append_dev(div5, div4);
    			append_dev(div4, a1);
    			append_dev(div4, t12);
    			append_dev(div4, a2);
    			append_dev(div4, t14);
    			append_dev(div4, a3);
    			append_dev(div4, t16);
    			append_dev(div4, a4);
    			append_dev(div7, t18);
    			append_dev(div7, div6);
    			if (if_block2) if_block2.m(div6, null);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, section2, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.x && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window.pageXOffset, ctx.x);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			if (ctx.data.title) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    				} else {
    					if_block0 = create_if_block_2$6(ctx);
    					if_block0.c();
    					if_block0.m(h1, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (ctx.data.content) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    				} else {
    					if_block1 = create_if_block_1$7(ctx);
    					if_block1.c();
    					if_block1.m(div7, t10);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (ctx.data.title) {
    				if (if_block2) {
    					if_block2.p(changed, ctx);
    					transition_in(if_block2, 1);
    				} else {
    					if_block2 = create_if_block$9(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div6, null);
    				}
    			} else if (if_block2) {
    				group_outros();
    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block2);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block2);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(section0);
    			}

    			if (if_block0) if_block0.d();

    			if (detaching) {
    				detach_dev(t8);
    				detach_dev(section1);
    			}

    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();

    			if (detaching) {
    				detach_dev(t19);
    				detach_dev(section2);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$c.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	
        let { id } = $$props;
        let data = [];
      
        let y;
        let x;
        const apiUrl = "https://ganesankar.co.in/wp-json/wp/v2/portfolio?slug=" + id;
        onMount(async function() {
          const response = await fetch(apiUrl);
          const dataArr = await response.json();
          $$invalidate('data', data = dataArr[0]);
        });

    	const writable_props = ['id'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Portfolio> was created with unknown prop '${key}'`);
    	});

    	function onwindowresize() {
    		y = window.innerHeight; $$invalidate('y', y);
    	}

    	function onwindowscroll() {
    		x = window.pageYOffset; $$invalidate('x', x);
    	}

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    	};

    	$$self.$capture_state = () => {
    		return { id, data, y, x };
    	};

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('data' in $$props) $$invalidate('data', data = $$props.data);
    		if ('y' in $$props) $$invalidate('y', y = $$props.y);
    		if ('x' in $$props) $$invalidate('x', x = $$props.x);
    	};

    	return {
    		id,
    		data,
    		y,
    		x,
    		onwindowresize,
    		onwindowscroll
    	};
    }

    class Portfolio extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, ["id"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Portfolio", options, id: create_fragment$c.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<Portfolio> was created without expected prop 'id'");
    		}
    	}

    	get id() {
    		throw new Error("<Portfolio>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Portfolio>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\routes\Public.svelte generated by Svelte v3.12.1 */

    const file$b = "src\\routes\\Public.svelte";

    function create_fragment$d(ctx) {
    	var t, h1;

    	const block = {
    		c: function create() {
    			t = space();
    			h1 = element("h1");
    			h1.textContent = "Public";
    			document.title = "Public Route";
    			add_location(h1, file$b, 4, 0, 60);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			insert_dev(target, h1, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    				detach_dev(h1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$d.name, type: "component", source: "", ctx });
    	return block;
    }

    class Public extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$d, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Public", options, id: create_fragment$d.name });
    	}
    }

    /* src\routes\Protected.svelte generated by Svelte v3.12.1 */
    const { console: console_1$1 } = globals;

    const file$c = "src\\routes\\Protected.svelte";

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.ac = list[i];
    	return child_ctx;
    }

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.ari = list[i];
    	return child_ctx;
    }

    function get_each_context$6(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.cat = list[i];
    	return child_ctx;
    }

    // (87:0) {:else}
    function create_else_block_1$3(ctx) {
    	var t_value = ctx.handlePrivateRoute() + "", t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block_1$3.name, type: "else", source: "(87:0) {:else}", ctx });
    	return block;
    }

    // (49:0) {#if $user && $user.username}
    function create_if_block$a(ctx) {
    	var section;

    	var if_block = (ctx.data && ctx.data.length > 0) && create_if_block_1$8(ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			if (if_block) if_block.c();
    			attr_dev(section, "class", "letter");
    			add_location(section, file$c, 50, 2, 1201);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			if (if_block) if_block.m(section, null);
    		},

    		p: function update(changed, ctx) {
    			if (ctx.data && ctx.data.length > 0) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_1$8(ctx);
    					if_block.c();
    					if_block.m(section, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section);
    			}

    			if (if_block) if_block.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$a.name, type: "if", source: "(49:0) {#if $user && $user.username}", ctx });
    	return block;
    }

    // (52:4) {#if data && data.length > 0}
    function create_if_block_1$8(ctx) {
    	var each_1_anchor;

    	let each_value = ctx.data;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$6(get_each_context$6(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.data) {
    				each_value = ctx.data;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$6(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$6(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach_dev(each_1_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$8.name, type: "if", source: "(52:4) {#if data && data.length > 0}", ctx });
    	return block;
    }

    // (56:10) {#if cat.content}
    function create_if_block_4$1(ctx) {
    	var html_tag, raw_value = ctx.cat.content + "";

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag(raw_value, null);
    		},

    		m: function mount(target, anchor) {
    			html_tag.m(target, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.data) && raw_value !== (raw_value = ctx.cat.content + "")) {
    				html_tag.p(raw_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				html_tag.d();
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_4$1.name, type: "if", source: "(56:10) {#if cat.content}", ctx });
    	return block;
    }

    // (59:10) {#if cat.array && cat.array.length > 0}
    function create_if_block_2$7(ctx) {
    	var div, t, each_1_anchor;

    	let each_value_1 = ctx.cat.array;

    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(div, file$c, 59, 12, 1468);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			insert_dev(target, t, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.data) {
    				each_value_1 = ctx.cat.array;

    				let i;
    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block_1$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value_1.length;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    				detach_dev(t);
    			}

    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach_dev(each_1_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2$7.name, type: "if", source: "(59:10) {#if cat.array && cat.array.length > 0}", ctx });
    	return block;
    }

    // (71:18) {:else}
    function create_else_block$5(ctx) {
    	var div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", `TimelineItem-badge bg-red text-white `);
    			add_location(div, file$c, 71, 20, 1962);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$5.name, type: "else", source: "(71:18) {:else}", ctx });
    	return block;
    }

    // (65:18) {#if ari.class && ari.class.length > 0}
    function create_if_block_3$5(ctx) {
    	var each_1_anchor;

    	let each_value_2 = ctx.ari.class;

    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.data) {
    				each_value_2 = ctx.ari.class;

    				let i;
    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block_2$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value_2.length;
    			}
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach_dev(each_1_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3$5.name, type: "if", source: "(65:18) {#if ari.class && ari.class.length > 0}", ctx });
    	return block;
    }

    // (66:20) {#each ari.class as ac}
    function create_each_block_2$1(ctx) {
    	var div, i, i_class_value, t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			t = space();
    			attr_dev(i, "class", i_class_value = `las ${ctx.ac} `);
    			add_location(i, file$c, 67, 24, 1832);
    			attr_dev(div, "class", `TimelineItem-badge bg-red text-white `);
    			add_location(div, file$c, 66, 22, 1754);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    			append_dev(div, t);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.data) && i_class_value !== (i_class_value = `las ${ctx.ac} `)) {
    				attr_dev(i, "class", i_class_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_2$1.name, type: "each", source: "(66:20) {#each ari.class as ac}", ctx });
    	return block;
    }

    // (62:12) {#each cat.array as ari}
    function create_each_block_1$2(ctx) {
    	var div2, div0, t0, div1, raw_value = ctx.ari.content + "", t1, div2_class_value;

    	function select_block_type_1(changed, ctx) {
    		if (ctx.ari.class && ctx.ari.class.length > 0) return create_if_block_3$5;
    		return create_else_block$5;
    	}

    	var current_block_type = select_block_type_1(null, ctx);
    	var if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			if_block.c();
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			attr_dev(div0, "class", "TimelineItem-badge-Container ");
    			add_location(div0, file$c, 63, 16, 1586);
    			attr_dev(div1, "class", "TimelineItem-body");
    			add_location(div1, file$c, 74, 16, 2081);
    			attr_dev(div2, "class", div2_class_value = `TimelineItem ${ctx.ari.type} `);
    			add_location(div2, file$c, 62, 14, 1528);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			if_block.m(div0, null);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			div1.innerHTML = raw_value;
    			append_dev(div2, t1);
    		},

    		p: function update(changed, ctx) {
    			if (current_block_type === (current_block_type = select_block_type_1(changed, ctx)) && if_block) {
    				if_block.p(changed, ctx);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			}

    			if ((changed.data) && raw_value !== (raw_value = ctx.ari.content + "")) {
    				div1.innerHTML = raw_value;
    			}

    			if ((changed.data) && div2_class_value !== (div2_class_value = `TimelineItem ${ctx.ari.type} `)) {
    				attr_dev(div2, "class", div2_class_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div2);
    			}

    			if_block.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_1$2.name, type: "each", source: "(62:12) {#each cat.array as ari}", ctx });
    	return block;
    }

    // (53:6) {#each data as cat}
    function create_each_block$6(ctx) {
    	var div, h4, t0_value = ctx.cat.name + "", t0, t1, t2, t3, hr, t4;

    	var if_block0 = (ctx.cat.content) && create_if_block_4$1(ctx);

    	var if_block1 = (ctx.cat.array && ctx.cat.array.length > 0) && create_if_block_2$7(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h4 = element("h4");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			t3 = space();
    			hr = element("hr");
    			t4 = space();
    			add_location(h4, file$c, 54, 10, 1310);
    			add_location(hr, file$c, 81, 10, 2242);
    			add_location(div, file$c, 53, 8, 1294);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h4);
    			append_dev(h4, t0);
    			append_dev(div, t1);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t2);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(div, t3);
    			append_dev(div, hr);
    			append_dev(div, t4);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.data) && t0_value !== (t0_value = ctx.cat.name + "")) {
    				set_data_dev(t0, t0_value);
    			}

    			if (ctx.cat.content) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    				} else {
    					if_block0 = create_if_block_4$1(ctx);
    					if_block0.c();
    					if_block0.m(div, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (ctx.cat.array && ctx.cat.array.length > 0) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    				} else {
    					if_block1 = create_if_block_2$7(ctx);
    					if_block1.c();
    					if_block1.m(div, t3);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$6.name, type: "each", source: "(53:6) {#each data as cat}", ctx });
    	return block;
    }

    function create_fragment$e(ctx) {
    	var scrolling = false, clear_scrolling = () => { scrolling = false; }, scrolling_timeout, t, if_block_anchor, dispose;

    	add_render_callback(ctx.onwindowresize);

    	add_render_callback(ctx.onwindowscroll);

    	function select_block_type(changed, ctx) {
    		if (ctx.$user && ctx.$user.username) return create_if_block$a;
    		return create_else_block_1$3;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			t = space();
    			if_block.c();
    			if_block_anchor = empty();
    			document.title = "Message : It's not goodbye again";

    			dispose = [
    				listen_dev(window, "resize", ctx.onwindowresize),
    				listen_dev(window, "scroll", () => {
    					scrolling = true;
    					clearTimeout(scrolling_timeout);
    					scrolling_timeout = setTimeout(clear_scrolling, 100);
    					ctx.onwindowscroll();
    				})
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.x && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window.pageXOffset, ctx.x);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block) {
    				if_block.p(changed, ctx);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}

    			if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$e.name, type: "component", source: "", ctx });
    	return block;
    }

    const apiURL =
        "/.netlify/functions/thumbelina";

    function instance$d($$self, $$props, $$invalidate) {
    	let $user;

    	validate_store(user, 'user');
    	component_subscribe($$self, user, $$value => { $user = $$value; $$invalidate('$user', $user); });

    	
      let data = [];
      let dataW = [];
      const key =  "fnAD3fyPz9ACB-";

      const simpleCrypto = new SimpleCrypto(key);


      let { location } = $$props;
      let datax;
      let y;
      let x;
      let cats;
      function handlePrivateRoute() {
        redirectURL.setRedirectURL(location.href);
        navigate("/", {
          replace: true,
        });

        Swal.fire({
          title: "You are not authenticated",
          text: "Please log in or sign up to view this page",
          type: "error",
          allowOutsideClick: false,
          confirmButtonText: "Will do!",
        });
      }

      onMount(async function() {
        console.log('role', $user);
        const response = await fetch(apiURL);
       const dataX = await response.json();
        const decipherText = simpleCrypto.decrypt(dataX.data);
       
       $$invalidate('data', data = decipherText[0].data.attachments);
      });

    	const writable_props = ['location'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console_1$1.warn(`<Protected> was created with unknown prop '${key}'`);
    	});

    	function onwindowresize() {
    		y = window.innerHeight; $$invalidate('y', y);
    	}

    	function onwindowscroll() {
    		x = window.pageYOffset; $$invalidate('x', x);
    	}

    	$$self.$set = $$props => {
    		if ('location' in $$props) $$invalidate('location', location = $$props.location);
    	};

    	$$self.$capture_state = () => {
    		return { data, dataW, location, datax, y, x, cats, $user };
    	};

    	$$self.$inject_state = $$props => {
    		if ('data' in $$props) $$invalidate('data', data = $$props.data);
    		if ('dataW' in $$props) dataW = $$props.dataW;
    		if ('location' in $$props) $$invalidate('location', location = $$props.location);
    		if ('datax' in $$props) datax = $$props.datax;
    		if ('y' in $$props) $$invalidate('y', y = $$props.y);
    		if ('x' in $$props) $$invalidate('x', x = $$props.x);
    		if ('cats' in $$props) cats = $$props.cats;
    		if ('$user' in $$props) user.set($user);
    	};

    	return {
    		data,
    		location,
    		y,
    		x,
    		handlePrivateRoute,
    		$user,
    		onwindowresize,
    		onwindowscroll
    	};
    }

    class Protected extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$e, safe_not_equal, ["location"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Protected", options, id: create_fragment$e.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.location === undefined && !('location' in props)) {
    			console_1$1.warn("<Protected> was created without expected prop 'location'");
    		}
    	}

    	get location() {
    		throw new Error("<Protected>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set location(value) {
    		throw new Error("<Protected>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\common\AppLoader.svelte generated by Svelte v3.12.1 */

    const file$d = "src\\common\\AppLoader.svelte";

    function create_fragment$f(ctx) {
    	var div2, div1, span0, t0, span1, t1, div0, svg, g1, title, t2, g0, path0, path1, circle0, circle1, circle2, circle3, t3, span2, div2_class_value;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			span0 = element("span");
    			t0 = space();
    			span1 = element("span");
    			t1 = space();
    			div0 = element("div");
    			svg = svg_element("svg");
    			g1 = svg_element("g");
    			title = svg_element("title");
    			t2 = text("Layer 1");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			circle0 = svg_element("circle");
    			circle1 = svg_element("circle");
    			circle2 = svg_element("circle");
    			circle3 = svg_element("circle");
    			t3 = space();
    			span2 = element("span");
    			span2.textContent = "LOADING CODE...";
    			attr_dev(span0, "class", "box svelte-paj2kr");
    			add_location(span0, file$d, 183, 2, 3808);
    			attr_dev(span1, "class", "box svelte-paj2kr");
    			add_location(span1, file$d, 184, 2, 3831);
    			add_location(title, file$d, 189, 8, 3960);
    			attr_dev(path0, "stroke", "null");
    			attr_dev(path0, "id", "svg_2");
    			attr_dev(path0, "d", "m62.26543,15.33037l0,-9.45795c0,-2.28161 -1.85624,-4.13785\n            -4.13785,-4.13785l-52.25516,0c-2.28161,0 -4.13785,1.85624\n            -4.13785,4.13785l0,9.45795c0,1.64734 0.96778,3.07253\n            2.36449,3.73778l0,32.55709l-0.59112,0c-0.97937,0 -1.77337,0.79399\n            -1.77337,1.77337l0,7.09346c0,0.97937 0.79399,1.77337\n            1.77337,1.77337l56.98413,0c0.97937,0 1.77337,-0.79399\n            1.77337,-1.77337l0,-7.09346c0,-0.97937 -0.79399,-1.77337\n            -1.77337,-1.77337l-0.59112,0l0,-32.55709c1.3967,-0.66537\n            2.36449,-2.09044\n            2.36449,-3.73778zm-3.54673,43.38833l-53.4374,0l0,-3.54673l53.4374,0l0,3.54673zm-43.38833,-28.61029l1.77337,0l0,2.95561c0,0.97937\n            0.79399,1.77337 1.77337,1.77337s1.77337,-0.79399\n            1.77337,-1.77337l0,-2.95561l1.77337,0c0.97937,0 1.77337,-0.79399\n            1.77337,-1.77337l0,-5.3201l0.59112,0c0.76337,0 1.44092,-0.48838\n            1.68233,-1.21263l0.77815,-2.3341l9.50252,0l0.77803,2.3341c0.24141,0.72424\n            0.91908,1.21263 1.68233,1.21263l0.59112,0l0,5.3201c0,0.97937\n            0.79399,1.77337 1.77337,1.77337l1.77337,0l0,2.95561c0,0.97937\n            0.79399,1.77337 1.77337,1.77337s1.77337,-0.79399\n            1.77337,-1.77337l0,-2.95561l1.77337,0c0.97937,0 1.77337,-0.79399\n            1.77337,-1.77337l0,-5.3201l0.59112,0c0.76326,0 1.44092,-0.48838\n            1.68233,-1.21263l0.77815,-2.3341l2.85961,0l0,32.15702l-4.26021,0c0.45493,-0.88751\n            0.71348,-1.89159 0.71348,-2.95561l0,-7.09346c0,-0.97937\n            -0.79399,-1.77337 -1.77337,-1.77337l-11.82243,0c-0.97937,0\n            -1.77337,0.79399 -1.77337,1.77337l0,1.77337l-1.77337,0c-0.97937,0\n            -1.77337,0.79399 -1.77337,1.77337s0.79399,1.77337\n            1.77337,1.77337l1.77337,0l0,1.77337c0,1.06402 0.25856,2.0681\n            0.71348,2.95561l-12.30361,0c0.45505,-0.88751 0.71348,-1.89159\n            0.71348,-2.95561l0,-1.77337l1.77337,0c0.97937,0 1.77337,-0.79399\n            1.77337,-1.77337s-0.79399,-1.77337\n            -1.77337,-1.77337l-1.77337,0l0,-1.77337c0,-0.97937 -0.79399,-1.77337\n            -1.77337,-1.77337l-11.82243,0c-0.97937,0 -1.77337,0.79399\n            -1.77337,1.77337l0,7.09346c0,1.06402 0.25856,2.0681\n            0.71348,2.95561l-4.26021,0l0,-32.15702l2.85961,0l0.77815,2.3341c0.24141,0.72424\n            0.91896,1.21263 1.68233,1.21263l0.59112,0l0,5.3201c0,0.97937\n            0.79399,1.77337\n            1.77337,1.77337zm1.77337,-3.54673l0,-3.54673l3.54673,0l0,3.54673l-3.54673,0zm26.2458,0l0,-3.54673l3.54673,0l0,3.54673l-3.54673,0zm5.91122,16.78786l0,5.3201c0,1.62972\n            -1.32589,2.95561 -2.95561,2.95561l-2.36449,0c-1.62972,0\n            -2.95561,-1.32589\n            -2.95561,-2.95561l0,-5.3201l8.2757,0zm-26.2458,0l0,5.3201c0,1.62972\n            -1.32589,2.95561 -2.95561,2.95561l-2.36449,0c-1.62972,0\n            -2.95561,-1.32589\n            -2.95561,-2.95561l0,-5.3201l8.2757,0zm35.70375,-28.01917c0,0.32594\n            -0.26518,0.59112 -0.59112,0.59112l-5.91122,0c-0.76326,0\n            -1.44092,0.48838\n            -1.68233,1.21263l-0.77815,2.3341l-9.26607,0l-0.77803,-2.3341c-0.24141,-0.72424\n            -0.91908,-1.21263 -1.68233,-1.21263l-12.05888,0c-0.76337,0\n            -1.44092,0.48838\n            -1.68233,1.21263l-0.77815,2.3341l-9.26607,0l-0.77815,-2.3341c-0.2413,-0.72424\n            -0.91884,-1.21263 -1.68221,-1.21263l-5.91122,0c-0.32594,0\n            -0.59112,-0.26518 -0.59112,-0.59112l0,-9.45795c0,-0.32594\n            0.26518,-0.59112 0.59112,-0.59112l52.25516,0c0.32594,0\n            0.59112,0.26518 0.59112,0.59112l0,9.45795z");
    			add_location(path0, file$d, 191, 10, 4030);
    			attr_dev(path1, "stroke", "null");
    			attr_dev(path1, "id", "svg_3");
    			attr_dev(path1, "d", "m27.1528,12.37476l9.6944,0c0.97937,0 1.77337,-0.79399\n            1.77337,-1.77337s-0.79399,-1.77337\n            -1.77337,-1.77337l-9.6944,0c-0.97937,0 -1.77337,0.79399\n            -1.77337,1.77337s0.79399,1.77337 1.77337,1.77337z");
    			add_location(path1, file$d, 245, 10, 7711);
    			attr_dev(circle0, "stroke", "null");
    			attr_dev(circle0, "id", "svg_4");
    			attr_dev(circle0, "r", "1.77337");
    			attr_dev(circle0, "cy", "10.60139");
    			attr_dev(circle0, "cx", "46.30515");
    			add_location(circle0, file$d, 252, 10, 8026);
    			attr_dev(circle1, "stroke", "null");
    			attr_dev(circle1, "id", "svg_5");
    			attr_dev(circle1, "r", "1.77337");
    			attr_dev(circle1, "cy", "10.60139");
    			attr_dev(circle1, "cx", "53.39861");
    			add_location(circle1, file$d, 258, 10, 8172);
    			attr_dev(circle2, "stroke", "null");
    			attr_dev(circle2, "id", "svg_6");
    			attr_dev(circle2, "r", "1.77337");
    			attr_dev(circle2, "cy", "10.60139");
    			attr_dev(circle2, "cx", "17.69485");
    			add_location(circle2, file$d, 264, 10, 8318);
    			attr_dev(circle3, "stroke", "null");
    			attr_dev(circle3, "id", "svg_7");
    			attr_dev(circle3, "r", "1.77337");
    			attr_dev(circle3, "cy", "10.60139");
    			attr_dev(circle3, "cx", "10.60139");
    			add_location(circle3, file$d, 270, 10, 8464);
    			attr_dev(g0, "stroke", "null");
    			attr_dev(g0, "id", "svg_1");
    			add_location(g0, file$d, 190, 8, 3991);
    			add_location(g1, file$d, 188, 6, 3948);
    			attr_dev(svg, "width", "64");
    			attr_dev(svg, "height", "64");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file$d, 186, 4, 3877);
    			attr_dev(div0, "class", "code svelte-paj2kr");
    			add_location(div0, file$d, 185, 2, 3854);
    			attr_dev(span2, "class", "txt svelte-paj2kr");
    			add_location(span2, file$d, 280, 2, 8646);
    			attr_dev(div1, "class", "loader svelte-paj2kr");
    			add_location(div1, file$d, 182, 0, 3785);
    			attr_dev(div2, "class", div2_class_value = "" + null_to_empty((`boxflex ${ctx.position}`)) + " svelte-paj2kr");
    			add_location(div2, file$d, 181, 0, 3749);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, span0);
    			append_dev(div1, t0);
    			append_dev(div1, span1);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, svg);
    			append_dev(svg, g1);
    			append_dev(g1, title);
    			append_dev(title, t2);
    			append_dev(g1, g0);
    			append_dev(g0, path0);
    			append_dev(g0, path1);
    			append_dev(g0, circle0);
    			append_dev(g0, circle1);
    			append_dev(g0, circle2);
    			append_dev(g0, circle3);
    			append_dev(div1, t3);
    			append_dev(div1, span2);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.position) && div2_class_value !== (div2_class_value = "" + null_to_empty((`boxflex ${ctx.position}`)) + " svelte-paj2kr")) {
    				attr_dev(div2, "class", div2_class_value);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div2);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$f.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { position } = $$props;

    	const writable_props = ['position'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<AppLoader> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('position' in $$props) $$invalidate('position', position = $$props.position);
    	};

    	$$self.$capture_state = () => {
    		return { position };
    	};

    	$$self.$inject_state = $$props => {
    		if ('position' in $$props) $$invalidate('position', position = $$props.position);
    	};

    	return { position };
    }

    class AppLoader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$f, safe_not_equal, ["position"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "AppLoader", options, id: create_fragment$f.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.position === undefined && !('position' in props)) {
    			console.warn("<AppLoader> was created without expected prop 'position'");
    		}
    	}

    	get position() {
    		throw new Error("<AppLoader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set position(value) {
    		throw new Error("<AppLoader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.12.1 */

    const file$e = "src\\App.svelte";

    // (250:0) {:else}
    function create_else_block$6(ctx) {
    	var current;

    	var apploader = new AppLoader({
    		props: { position: "full" },
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			apploader.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(apploader, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(apploader.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(apploader.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(apploader, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$6.name, type: "else", source: "(250:0) {:else}", ctx });
    	return block;
    }

    // (118:0) {#if appData && userData && tagsData && categoryData}
    function create_if_block$b(ctx) {
    	var main, header, div4, div3, div1, div0, t0, div2, button, span1, span0, t1, nav, ul, t2, t3, div5, t4, a0, div7, div6, h2, span2, t5, b, t6, t7_value = ctx.days[ctx.random] + "", t7, t8, t9, span3, t11, footer, div11, div10, div8, p, t12, br0, t13, a1, t15, a2, t17, br1, t18, t19, t20, a3, t22, div9, a4, span4, t23, a5, span5, t24, a6, span6, t25, a7, span7, current;

    	var router0 = new Router({
    		props: {
    		$$slots: { default: [create_default_slot_8] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var router1 = new Router({
    		props: {
    		$$slots: { default: [create_default_slot_1$5] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var router2 = new Router({
    		props: {
    		$$slots: { default: [create_default_slot$5] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			main = element("main");
    			header = element("header");
    			div4 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			router0.$$.fragment.c();
    			t0 = space();
    			div2 = element("div");
    			button = element("button");
    			span1 = element("span");
    			span0 = element("span");
    			t1 = space();
    			nav = element("nav");
    			ul = element("ul");
    			router1.$$.fragment.c();
    			t2 = space();
    			router2.$$.fragment.c();
    			t3 = space();
    			div5 = element("div");
    			t4 = space();
    			a0 = element("a");
    			div7 = element("div");
    			div6 = element("div");
    			h2 = element("h2");
    			span2 = element("span");
    			t5 = text("Have\n            ");
    			b = element("b");
    			t6 = text("a ");
    			t7 = text(t7_value);
    			t8 = text("\n            day.");
    			t9 = space();
    			span3 = element("span");
    			span3.textContent = "Let's chat we are good people.";
    			t11 = space();
    			footer = element("footer");
    			div11 = element("div");
    			div10 = element("div");
    			div8 = element("div");
    			p = element("p");
    			t12 = text("What's Meant To Be Will Always Find Its Way\n            ");
    			br0 = element("br");
    			t13 = text("\n            This page is designed, built on\n            ");
    			a1 = element("a");
    			a1.textContent = "Svelte";
    			t15 = text("\n            , and backed by\n            ");
    			a2 = element("a");
    			a2.textContent = "Netlify";
    			t17 = text("\n            .\n            ");
    			br1 = element("br");
    			t18 = text("\n            Copyright © ");
    			t19 = text(ctx.n);
    			t20 = space();
    			a3 = element("a");
    			a3.textContent = "Ganesan Karuppaiya.";
    			t22 = space();
    			div9 = element("div");
    			a4 = element("a");
    			span4 = element("span");
    			t23 = space();
    			a5 = element("a");
    			span5 = element("span");
    			t24 = space();
    			a6 = element("a");
    			span6 = element("span");
    			t25 = space();
    			a7 = element("a");
    			span7 = element("span");
    			attr_dev(div0, "class", "site-logo");
    			add_location(div0, file$e, 123, 12, 3036);
    			attr_dev(div1, "class", "col-sm-3 col-3");
    			add_location(div1, file$e, 122, 10, 2995);
    			attr_dev(span0, "class", "hamburger-inner");
    			add_location(span0, file$e, 138, 16, 3467);
    			attr_dev(span1, "class", "hamburger-box");
    			add_location(span1, file$e, 137, 14, 3422);
    			attr_dev(button, "class", "hamburger hamburger--spin toggle-menu ml-auto\n              js-toggle-menu");
    			attr_dev(button, "type", "button");
    			add_location(button, file$e, 133, 12, 3274);
    			attr_dev(ul, "class", "list-unstyled");
    			add_location(ul, file$e, 142, 14, 3637);
    			attr_dev(nav, "class", "templateux-menu js-templateux-menu");
    			attr_dev(nav, "role", "navigation");
    			add_location(nav, file$e, 141, 12, 3556);
    			attr_dev(div2, "class", "col-sm-9 col-9 text-right");
    			add_location(div2, file$e, 132, 10, 3222);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file$e, 121, 8, 2967);
    			attr_dev(div4, "class", "container-fluid");
    			add_location(div4, file$e, 120, 6, 2929);
    			attr_dev(header, "class", "templateux-navbar aos-init aos-animate");
    			attr_dev(header, "data-aos", "fade-down");
    			add_location(header, file$e, 119, 4, 2846);
    			attr_dev(main, "data-animsition-in-class", "fade-in");
    			attr_dev(main, "data-animsition-out-class", "fade-out");
    			add_location(main, file$e, 118, 2, 2763);
    			attr_dev(div5, "class", "clearfix");
    			add_location(div5, file$e, 194, 2, 5378);
    			attr_dev(b, "data-superlatives", "");
    			add_location(b, file$e, 205, 12, 5687);
    			attr_dev(span2, "class", "words-1");
    			add_location(span2, file$e, 203, 10, 5635);
    			attr_dev(span3, "class", "words-2");
    			add_location(span3, file$e, 208, 10, 5777);
    			add_location(h2, file$e, 202, 8, 5620);
    			attr_dev(div6, "class", "cta-inner");
    			add_location(div6, file$e, 201, 6, 5588);
    			attr_dev(div7, "class", "container-fluid");
    			add_location(div7, file$e, 200, 4, 5552);
    			attr_dev(a0, "class", "templateux-section templateux-cta animsition-link mt-5 aos-init\n    aos-animate");
    			attr_dev(a0, "href", "contact.html");
    			attr_dev(a0, "data-aos", "fade-up");
    			add_location(a0, file$e, 195, 2, 5405);
    			add_location(br0, file$e, 219, 12, 6115);
    			attr_dev(a1, "href", "hhttps://svelte.dev/");
    			attr_dev(a1, "target", "_blank");
    			add_location(a1, file$e, 221, 12, 6178);
    			attr_dev(a2, "href", "https://netlify.com");
    			attr_dev(a2, "target", "_blank");
    			add_location(a2, file$e, 223, 12, 6276);
    			add_location(br1, file$e, 225, 12, 6360);
    			attr_dev(a3, "href", "https://ganesankar.co.in");
    			attr_dev(a3, "target", "_blank");
    			add_location(a3, file$e, 227, 12, 6412);
    			add_location(p, file$e, 217, 10, 6043);
    			attr_dev(div8, "class", "col-md-6 text-md-left text-center");
    			add_location(div8, file$e, 216, 8, 5985);
    			attr_dev(span4, "class", "icon-facebook2");
    			add_location(span4, file$e, 234, 12, 6663);
    			attr_dev(a4, "href", "#");
    			attr_dev(a4, "class", "p-3");
    			add_location(a4, file$e, 233, 10, 6626);
    			attr_dev(span5, "class", "icon-twitter2");
    			add_location(span5, file$e, 237, 12, 6757);
    			attr_dev(a5, "href", "#");
    			attr_dev(a5, "class", "p-3");
    			add_location(a5, file$e, 236, 10, 6720);
    			attr_dev(span6, "class", "icon-dribbble2");
    			add_location(span6, file$e, 240, 12, 6850);
    			attr_dev(a6, "href", "#");
    			attr_dev(a6, "class", "p-3");
    			add_location(a6, file$e, 239, 10, 6813);
    			attr_dev(span7, "class", "icon-instagram");
    			add_location(span7, file$e, 243, 12, 6944);
    			attr_dev(a7, "href", "#");
    			attr_dev(a7, "class", "p-3");
    			add_location(a7, file$e, 242, 10, 6907);
    			attr_dev(div9, "class", "col-md-6 text-md-right text-center footer-social");
    			add_location(div9, file$e, 232, 8, 6553);
    			attr_dev(div10, "class", "row");
    			add_location(div10, file$e, 215, 6, 5959);
    			attr_dev(div11, "class", "container-fluid");
    			add_location(div11, file$e, 214, 4, 5923);
    			attr_dev(footer, "class", "templateux-footer");
    			add_location(footer, file$e, 213, 2, 5884);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, header);
    			append_dev(header, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, div0);
    			mount_component(router0, div0, null);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, button);
    			append_dev(button, span1);
    			append_dev(span1, span0);
    			append_dev(div2, t1);
    			append_dev(div2, nav);
    			append_dev(nav, ul);
    			mount_component(router1, ul, null);
    			append_dev(main, t2);
    			mount_component(router2, main, null);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div5, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, a0, anchor);
    			append_dev(a0, div7);
    			append_dev(div7, div6);
    			append_dev(div6, h2);
    			append_dev(h2, span2);
    			append_dev(span2, t5);
    			append_dev(span2, b);
    			append_dev(b, t6);
    			append_dev(b, t7);
    			append_dev(span2, t8);
    			append_dev(h2, t9);
    			append_dev(h2, span3);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div8);
    			append_dev(div8, p);
    			append_dev(p, t12);
    			append_dev(p, br0);
    			append_dev(p, t13);
    			append_dev(p, a1);
    			append_dev(p, t15);
    			append_dev(p, a2);
    			append_dev(p, t17);
    			append_dev(p, br1);
    			append_dev(p, t18);
    			append_dev(p, t19);
    			append_dev(p, t20);
    			append_dev(p, a3);
    			append_dev(div10, t22);
    			append_dev(div10, div9);
    			append_dev(div9, a4);
    			append_dev(a4, span4);
    			append_dev(div9, t23);
    			append_dev(div9, a5);
    			append_dev(a5, span5);
    			append_dev(div9, t24);
    			append_dev(div9, a6);
    			append_dev(a6, span6);
    			append_dev(div9, t25);
    			append_dev(div9, a7);
    			append_dev(a7, span7);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var router0_changes = {};
    			if (changed.$$scope) router0_changes.$$scope = { changed, ctx };
    			router0.$set(router0_changes);

    			var router1_changes = {};
    			if (changed.$$scope) router1_changes.$$scope = { changed, ctx };
    			router1.$set(router1_changes);

    			var router2_changes = {};
    			if (changed.$$scope) router2_changes.$$scope = { changed, ctx };
    			router2.$set(router2_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(router0.$$.fragment, local);

    			transition_in(router1.$$.fragment, local);

    			transition_in(router2.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(router0.$$.fragment, local);
    			transition_out(router1.$$.fragment, local);
    			transition_out(router2.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(main);
    			}

    			destroy_component(router0);

    			destroy_component(router1);

    			destroy_component(router2);

    			if (detaching) {
    				detach_dev(t3);
    				detach_dev(div5);
    				detach_dev(t4);
    				detach_dev(a0);
    				detach_dev(t11);
    				detach_dev(footer);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$b.name, type: "if", source: "(118:0) {#if appData && userData && tagsData && categoryData}", ctx });
    	return block;
    }

    // (128:16) <Link css="animsition-link" to="/">
    function create_default_slot_9(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Ganesan");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_9.name, type: "slot", source: "(128:16) <Link css=\"animsition-link\" to=\"/\">", ctx });
    	return block;
    }

    // (126:14) <Router>
    function create_default_slot_8(ctx) {
    	var current;

    	var link = new Link({
    		props: {
    		css: "animsition-link",
    		to: "/",
    		$$slots: { default: [create_default_slot_9] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			link.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(link, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link_changes = {};
    			if (changed.$$scope) link_changes.$$scope = { changed, ctx };
    			link.$set(link_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(link, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_8.name, type: "slot", source: "(126:14) <Router>", ctx });
    	return block;
    }

    // (148:20) <Link css="animsition-link" to="/">
    function create_default_slot_7(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Home");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_7.name, type: "slot", source: "(148:20) <Link css=\"animsition-link\" to=\"/\">", ctx });
    	return block;
    }

    // (151:20) <Link css="animsition-link" to="/page/about">
    function create_default_slot_6(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("About");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_6.name, type: "slot", source: "(151:20) <Link css=\"animsition-link\" to=\"/page/about\">", ctx });
    	return block;
    }

    // (154:20) <Link css="animsition-link" to="/page/services">
    function create_default_slot_5(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Services");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_5.name, type: "slot", source: "(154:20) <Link css=\"animsition-link\" to=\"/page/services\">", ctx });
    	return block;
    }

    // (159:20) <Link css="animsition-link" to="/portfolio">
    function create_default_slot_4(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Works");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_4.name, type: "slot", source: "(159:20) <Link css=\"animsition-link\" to=\"/portfolio\">", ctx });
    	return block;
    }

    // (162:20) <Link css="animsition-link" to="/blog">
    function create_default_slot_3(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Blog");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_3.name, type: "slot", source: "(162:20) <Link css=\"animsition-link\" to=\"/blog\">", ctx });
    	return block;
    }

    // (165:20) <Link css="animsition-link" to="/contact">
    function create_default_slot_2$4(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Contact");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_2$4.name, type: "slot", source: "(165:20) <Link css=\"animsition-link\" to=\"/contact\">", ctx });
    	return block;
    }

    // (145:16) <Router>
    function create_default_slot_1$5(ctx) {
    	var li0, t0, li1, t1, li2, t2, li3, t3, li4, t4, li5, current;

    	var link0 = new Link({
    		props: {
    		css: "animsition-link",
    		to: "/",
    		$$slots: { default: [create_default_slot_7] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var link1 = new Link({
    		props: {
    		css: "animsition-link",
    		to: "/page/about",
    		$$slots: { default: [create_default_slot_6] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var link2 = new Link({
    		props: {
    		css: "animsition-link",
    		to: "/page/services",
    		$$slots: { default: [create_default_slot_5] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var link3 = new Link({
    		props: {
    		css: "animsition-link",
    		to: "/portfolio",
    		$$slots: { default: [create_default_slot_4] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var link4 = new Link({
    		props: {
    		css: "animsition-link",
    		to: "/blog",
    		$$slots: { default: [create_default_slot_3] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var link5 = new Link({
    		props: {
    		css: "animsition-link",
    		to: "/contact",
    		$$slots: { default: [create_default_slot_2$4] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			li0 = element("li");
    			link0.$$.fragment.c();
    			t0 = space();
    			li1 = element("li");
    			link1.$$.fragment.c();
    			t1 = space();
    			li2 = element("li");
    			link2.$$.fragment.c();
    			t2 = space();
    			li3 = element("li");
    			link3.$$.fragment.c();
    			t3 = space();
    			li4 = element("li");
    			link4.$$.fragment.c();
    			t4 = space();
    			li5 = element("li");
    			link5.$$.fragment.c();
    			attr_dev(li0, "class", "d-md-none d-block active");
    			add_location(li0, file$e, 146, 18, 3709);
    			add_location(li1, file$e, 149, 18, 3856);
    			add_location(li2, file$e, 152, 18, 3981);
    			add_location(li3, file$e, 157, 18, 4156);
    			add_location(li4, file$e, 160, 18, 4280);
    			add_location(li5, file$e, 163, 18, 4398);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, li0, anchor);
    			mount_component(link0, li0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, li1, anchor);
    			mount_component(link1, li1, null);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, li2, anchor);
    			mount_component(link2, li2, null);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, li3, anchor);
    			mount_component(link3, li3, null);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, li4, anchor);
    			mount_component(link4, li4, null);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, li5, anchor);
    			mount_component(link5, li5, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link0_changes = {};
    			if (changed.$$scope) link0_changes.$$scope = { changed, ctx };
    			link0.$set(link0_changes);

    			var link1_changes = {};
    			if (changed.$$scope) link1_changes.$$scope = { changed, ctx };
    			link1.$set(link1_changes);

    			var link2_changes = {};
    			if (changed.$$scope) link2_changes.$$scope = { changed, ctx };
    			link2.$set(link2_changes);

    			var link3_changes = {};
    			if (changed.$$scope) link3_changes.$$scope = { changed, ctx };
    			link3.$set(link3_changes);

    			var link4_changes = {};
    			if (changed.$$scope) link4_changes.$$scope = { changed, ctx };
    			link4.$set(link4_changes);

    			var link5_changes = {};
    			if (changed.$$scope) link5_changes.$$scope = { changed, ctx };
    			link5.$set(link5_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);

    			transition_in(link1.$$.fragment, local);

    			transition_in(link2.$$.fragment, local);

    			transition_in(link3.$$.fragment, local);

    			transition_in(link4.$$.fragment, local);

    			transition_in(link5.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			transition_out(link2.$$.fragment, local);
    			transition_out(link3.$$.fragment, local);
    			transition_out(link4.$$.fragment, local);
    			transition_out(link5.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(li0);
    			}

    			destroy_component(link0);

    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(li1);
    			}

    			destroy_component(link1);

    			if (detaching) {
    				detach_dev(t1);
    				detach_dev(li2);
    			}

    			destroy_component(link2);

    			if (detaching) {
    				detach_dev(t2);
    				detach_dev(li3);
    			}

    			destroy_component(link3);

    			if (detaching) {
    				detach_dev(t3);
    				detach_dev(li4);
    			}

    			destroy_component(link4);

    			if (detaching) {
    				detach_dev(t4);
    				detach_dev(li5);
    			}

    			destroy_component(link5);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1$5.name, type: "slot", source: "(145:16) <Router>", ctx });
    	return block;
    }

    // (174:4) <Router>
    function create_default_slot$5(ctx) {
    	var t0, t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, current;

    	var route0 = new Route({
    		props: {
    		path: "/preface",
    		component: Public
    	},
    		$$inline: true
    	});

    	var route1 = new Route({
    		props: {
    		path: "/page/:id",
    		component: Page
    	},
    		$$inline: true
    	});

    	var route2 = new Route({
    		props: { path: "/blog", component: Blog },
    		$$inline: true
    	});

    	var route3 = new Route({
    		props: {
    		path: "/blog/:page",
    		component: Blog
    	},
    		$$inline: true
    	});

    	var route4 = new Route({
    		props: {
    		path: "/category/:category",
    		component: Category
    	},
    		$$inline: true
    	});

    	var route5 = new Route({
    		props: {
    		path: "/category/:category/:page",
    		component: Category
    	},
    		$$inline: true
    	});

    	var route6 = new Route({
    		props: {
    		path: "/tags/:tag",
    		component: Tag
    	},
    		$$inline: true
    	});

    	var route7 = new Route({
    		props: {
    		path: "/tags/:tag/:page",
    		component: Tag
    	},
    		$$inline: true
    	});

    	var route8 = new Route({
    		props: {
    		path: "/post/:id",
    		component: Post
    	},
    		$$inline: true
    	});

    	var route9 = new Route({
    		props: {
    		path: "/portfolio",
    		component: Portfolio
    	},
    		$$inline: true
    	});

    	var route10 = new Route({
    		props: {
    		path: "/portfolio/:id",
    		component: Portfolio
    	},
    		$$inline: true
    	});

    	var route11 = new Route({
    		props: {
    		path: "/letter",
    		component: Protected
    	},
    		$$inline: true
    	});

    	var route12 = new Route({
    		props: { path: "/", component: Home },
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			route0.$$.fragment.c();
    			t0 = space();
    			route1.$$.fragment.c();
    			t1 = space();
    			route2.$$.fragment.c();
    			t2 = space();
    			route3.$$.fragment.c();
    			t3 = space();
    			route4.$$.fragment.c();
    			t4 = space();
    			route5.$$.fragment.c();
    			t5 = space();
    			route6.$$.fragment.c();
    			t6 = space();
    			route7.$$.fragment.c();
    			t7 = space();
    			route8.$$.fragment.c();
    			t8 = space();
    			route9.$$.fragment.c();
    			t9 = space();
    			route10.$$.fragment.c();
    			t10 = space();
    			route11.$$.fragment.c();
    			t11 = space();
    			route12.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(route0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(route1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(route2, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(route3, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(route4, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(route5, target, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(route6, target, anchor);
    			insert_dev(target, t6, anchor);
    			mount_component(route7, target, anchor);
    			insert_dev(target, t7, anchor);
    			mount_component(route8, target, anchor);
    			insert_dev(target, t8, anchor);
    			mount_component(route9, target, anchor);
    			insert_dev(target, t9, anchor);
    			mount_component(route10, target, anchor);
    			insert_dev(target, t10, anchor);
    			mount_component(route11, target, anchor);
    			insert_dev(target, t11, anchor);
    			mount_component(route12, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(route0.$$.fragment, local);

    			transition_in(route1.$$.fragment, local);

    			transition_in(route2.$$.fragment, local);

    			transition_in(route3.$$.fragment, local);

    			transition_in(route4.$$.fragment, local);

    			transition_in(route5.$$.fragment, local);

    			transition_in(route6.$$.fragment, local);

    			transition_in(route7.$$.fragment, local);

    			transition_in(route8.$$.fragment, local);

    			transition_in(route9.$$.fragment, local);

    			transition_in(route10.$$.fragment, local);

    			transition_in(route11.$$.fragment, local);

    			transition_in(route12.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			transition_out(route3.$$.fragment, local);
    			transition_out(route4.$$.fragment, local);
    			transition_out(route5.$$.fragment, local);
    			transition_out(route6.$$.fragment, local);
    			transition_out(route7.$$.fragment, local);
    			transition_out(route8.$$.fragment, local);
    			transition_out(route9.$$.fragment, local);
    			transition_out(route10.$$.fragment, local);
    			transition_out(route11.$$.fragment, local);
    			transition_out(route12.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(route0, detaching);

    			if (detaching) {
    				detach_dev(t0);
    			}

    			destroy_component(route1, detaching);

    			if (detaching) {
    				detach_dev(t1);
    			}

    			destroy_component(route2, detaching);

    			if (detaching) {
    				detach_dev(t2);
    			}

    			destroy_component(route3, detaching);

    			if (detaching) {
    				detach_dev(t3);
    			}

    			destroy_component(route4, detaching);

    			if (detaching) {
    				detach_dev(t4);
    			}

    			destroy_component(route5, detaching);

    			if (detaching) {
    				detach_dev(t5);
    			}

    			destroy_component(route6, detaching);

    			if (detaching) {
    				detach_dev(t6);
    			}

    			destroy_component(route7, detaching);

    			if (detaching) {
    				detach_dev(t7);
    			}

    			destroy_component(route8, detaching);

    			if (detaching) {
    				detach_dev(t8);
    			}

    			destroy_component(route9, detaching);

    			if (detaching) {
    				detach_dev(t9);
    			}

    			destroy_component(route10, detaching);

    			if (detaching) {
    				detach_dev(t10);
    			}

    			destroy_component(route11, detaching);

    			if (detaching) {
    				detach_dev(t11);
    			}

    			destroy_component(route12, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$5.name, type: "slot", source: "(174:4) <Router>", ctx });
    	return block;
    }

    function create_fragment$g(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block$b,
    		create_else_block$6
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.appData && ctx.userData && ctx.tagsData && ctx.categoryData) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$g.name, type: "component", source: "", ctx });
    	return block;
    }

    const appUrl = "https://ganesankar.co.in/wp-json/";

    const usersUrl = "wp/v2/users";

    const categoryUrl = "wp/v2/categories";

    const tagsUrl = "wp/v2/tags";

    function instance$f($$self, $$props, $$invalidate) {
    	let $user;

    	validate_store(user, 'user');
    	component_subscribe($$self, user, $$value => { $user = $$value; $$invalidate('$user', $user); });

    	
      let days = [
        "marvellous",
        "magnificent",
        "superb",
        "glorious",
        "sublime",
        "lovely",
        "delightful",
        "first-class",
        "super",
        "great",
        "amazing",
        "fantastic",
        "terrific",
        "tremendous",
        "sensational",
        "incredible",
        "heavenly",
        "gorgeous",
        "dreamy",
        "grand",
        "fabulous",
        "fab",
        "fabby",
        "fantabulous",
        "awesome",
        "magic",
        "ace",
        "cool",
        "mean",
        "mega",
        "mind-blowing",
        "A1",
        "sound",
        "marvy",
        "spanking",
        "brilliant",
        "smashing",
        "peachy",
        "neat",
        "bodacious",
        "beaut",
        "groovy",
        "divine",
        "capital",
        "champion",
        "cracking",
        "keen",
        "wondrous",
        "goodly",
      ];
      const random = Math.floor(Math.random() * days.length);
      const d = new Date();
      const n = d.getFullYear();
      AOS.init();
      let appData;
      let userData;
      let categoryData;
      let tagsData;

      onMount(async function() {
        const appResponse = await fetch(appUrl);
        $$invalidate('appData', appData = await appResponse.json());
        console.log(appData);
        delete appData.routes;
        appInfo.set(appData);

        //users
        const userResponse = await fetch(appUrl + usersUrl);
        $$invalidate('userData', userData = await userResponse.json());
        console.log(userData);
        userList.set(userData);

        //categories
        const categoryResponse = await fetch(appUrl + categoryUrl);
        $$invalidate('categoryData', categoryData = await categoryResponse.json());
        console.log(categoryData);
        categoryList.set(categoryData);

        //tags
        const tagsResponse = await fetch(appUrl + tagsUrl);
        $$invalidate('tagsData', tagsData = await tagsResponse.json());
        tagsList.set(tagsData);
      });

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('days' in $$props) $$invalidate('days', days = $$props.days);
    		if ('appData' in $$props) $$invalidate('appData', appData = $$props.appData);
    		if ('userData' in $$props) $$invalidate('userData', userData = $$props.userData);
    		if ('categoryData' in $$props) $$invalidate('categoryData', categoryData = $$props.categoryData);
    		if ('tagsData' in $$props) $$invalidate('tagsData', tagsData = $$props.tagsData);
    		if ('isLoggedIn' in $$props) isLoggedIn = $$props.isLoggedIn;
    		if ('$user' in $$props) user.set($user);
    		if ('username' in $$props) username = $$props.username;
    	};

    	let isLoggedIn, username;

    	$$self.$$.update = ($$dirty = { $user: 1 }) => {
    		if ($$dirty.$user) { isLoggedIn = !!$user; }
    		if ($$dirty.$user) { username = $user !== null ? $user.username : " there!"; }
    	};

    	return {
    		days,
    		random,
    		n,
    		appData,
    		userData,
    		categoryData,
    		tagsData
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$g, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$g.name });
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
