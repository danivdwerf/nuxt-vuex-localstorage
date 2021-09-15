/**
 * @typedef MutationInfo
 * @property {string|null} namespace The namespace of the store. Is null when the store is defined in index.(js|ts)
 * @property {string} stateName The name of the state to synchronise.
 * @property {string} mutation The mutation name used to update/set the state.
 * @property {stirng} storageName The key used to store the state in localstorage.
 */

/**
 * Transform the mutations to an object containing all values needed by the plugin.
 * 
 * @param {Record<string, any>} mutations 
 * @returns {Array<MutationInfo>}
 */
const findTargetMutations = (mutations)=>
{
    // Find all mutation that follow the *FromStorage naming scheme.
    const actions = Object.keys(mutations).filter(action=> action.toLowerCase().endsWith("fromstorage"));

    const targets = [];
    const len = actions.length;
    for(let i = 0; i < len; i++)
    {
        const split = actions[i].split("/");
        if(split.length < 1 || split.length > 2)
            continue;
    
        // If the mutation doesn't gave a namespace we need index 0 of the split, otherwise we need index 1.
        const mutationIndex = split.length === 1 ? 0 : 1;

        // If the mutation doesn't start at index 0, it means that the namespace is stored at index 0.
        const namespace = mutationIndex === 0 ? null : split[0];

        const stateName = split[mutationIndex].substr(0, split[mutationIndex].toLowerCase().indexOf("fromstorage"));

        const info = {
            namespace: namespace,
            stateName: stateName,
            storageName: stateName,
            mutation: split[mutationIndex]
        };

        // Allow different namespaces too have the same state names by appending the namespace name to the state name.
        let storageName = info.stateName;
        if(!!info.namespace)
        {
            storageName = `${info.namespace}-${info.stateName}`;
            info.mutation = `${info.namespace}/${info.mutation}`;
        }
        
        info.storageName = storageName;
        targets.push(info);
    }

    return targets;
};

/**
 * Load and parse a value from localstorage,
 * 
 * @param {String} key 
 * @returns {any}
 */
const loadInitialLocalStorage = key=>
{
    let storage;
    try{storage = localStorage.getItem(key);}
    catch(error){return null;}

    if(!storage)
        return null;

    let json;
    try{json = JSON.parse(storage);}
    catch(error){return null;}

    return json;
};

export default function (options)
{
    const states = findTargetMutations(options.store._mutations);

    const plugin = {
        // These are empty since we want to set them dynamically.
        watch: {},
        computed: {},

        /**
         * Try to load all initial values from localstorage and commit them if the exist.
         */
		beforeCreate()
        {
            const len = states.length;
            for(let i = 0; i < len; i++)
            {
                const state = states[i];
                const initialValue = loadInitialLocalStorage(state.storageName);
                if(!!initialValue)
                    this.$store.commit(state.mutation, initialValue);
            }
		},
        methods: {
            /**
             * Save the given value in localstorage by the given key.
             * 
             * @param {String} key 
             * @param {any} value 
             */
            syncLocalStorage(key, value)
            {
                let content;
                try{content = JSON.stringify(value);}
                catch(error){return console.warn("Failed to synchronize local storage", error);}

                try{localStorage.setItem(key, content);}
                catch(error){return console.warn("Failed to synchronize local storage", error);}
            }
        }
	};

    const len = states.length;
    for(let i = 0; i < len; i++)
    {
        const state = states[i];

        // The name of the computed object.
        let computed = state.stateName;
        if(!!state.namespace)
            computed = state.namespace + state.stateName;

        // Setup the computed values.
        plugin.computed[computed] = function()
        {
            let storeState = this.$store.state;
            if(state.namespace)
                storeState = storeState[state.namespace];
                
            return storeState[state.stateName];
        }

        // Watch the computed value and synchronize local storage.
        plugin.watch[computed] = function(val, previous)
        {
            if(val === previous)
                return;

            this.syncLocalStorage(state.storageName, val);
        }
    }

    if(!options.app.mixins)
        options.app.mixins = [];

    options.app.mixins.push(plugin);
};