const parseMutations = (mutations)=>
{
    // Find all mutation that follow the *FromStorage naming scheme.
    const actions = Object.keys(mutations)
        .filter(action=> action.toLowerCase().includes("fromstorage"));

    const states = actions.map(action=>
    {
        // Split the store namespace from the mutation method.
        const split = action.split("/");

        // Unsupported mutation scheme.
        if(split.length < 1 || split.length > 2)
            return;
        
        const tmp = {
            context: null,
            stateName: null,
            mutation: null,
            computedName: null
        };

        // This means the store file is the index.(ts|js)
        if(split.length === 1)
        {
            tmp.mutation = split[0];
            tmp.stateName = split[0].substr(0, split[0].toLowerCase().indexOf("fromstorage"));
        }
        // This means the store has it's own file within the stores folder.
        else
        {
            tmp.context = split[0];
            tmp.mutation = split[1];
            tmp.stateName = split[1].substr(0, split[1].toLowerCase().indexOf("fromstorage"));
        }

        // The name of the computed object.
        let computed = tmp.stateName;
        if(!!tmp.context)
            computed = tmp.context + capitalize(tmp.stateName);

        tmp.computedName = computed;

        // The key in the localstorage.
        let storageName = tmp.stateName;
        if(!!tmp.context)
            storageName = `${tmp.context}-${tmp.stateName}`;
        
        tmp.storageName = storageName;
        return tmp;
    });

    return states;
};

function capitalize(word)
{
    return word
        .toLowerCase()
        .replace(/\w/, firstLetter => firstLetter.toUpperCase());
}

export default function (options)
{
    const states = parseMutations(options.store._mutations);
    const plugin = {
		beforeCreate()
        {
            const loadInitialLocalStorage = (key, commit)=>
            {
                let storage;
                try{storage = localStorage.getItem(key);}
                catch(error){return;}

                if(!storage)
                    return;

                let json;
                try{json = JSON.parse(storage);}
                catch(error){return;}

                this.$store.commit(commit, json);
            };

            states.forEach(state=>
            {   
                let mutation = state.mutation;
                if(!!state.context)
                    mutation = `${state.context}/${mutation}`;

                loadInitialLocalStorage(state.storageName, mutation);
            });
		},
        computed: {},
        watch: {},
        methods: {
            syncLocalStorage(key, value)
            {
                let content;
                try{content = JSON.stringify(value);}
                catch(error){return console.warn("Failed to synchronize local storage");}

                try{localStorage.setItem(key, content);}
                catch(error){return console.warn("Failed to synchronize local storage");}
            }
        }
	};


    states.forEach(state=>
    {
        // Setup the computed values.
        plugin.computed[state.computedName] = function()
        {
            let storeState = this.$store.state;
            if(state.context)
                storeState = storeState[state.context];
                
            return storeState[state.stateName];
        }

        // Watch the computed value and synchronize local storage.
        plugin.watch[state.computedName] = function(val, previous)
        {
            if(val === previous)
                return;

            this.syncLocalStorage(state.storageName, val);
        }
    });

    if(!options.app.mixins)
        options.app.mixins = [];

    options.app.mixins.push(plugin);
};