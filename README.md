# nuxt-vuex-localstorage-sync
This plugin will allow you to load states from localstorage and automatically update the localstorage value when the state is changed.

All states are loaded in the app component's `beforeCreate` hook, so all states will be available in the `beforeMount` and `mounted` hooks. The plugin is very basic and doesn't require any setting up.All you need to do is follow the naming conventions.

## Installation
```bash
npm i -S nuxt-vuex-localstorage-sync
```

## How to use
```js
// nuxt.config.js
export default {
    plugins: [
        "node_modules/nuxt-vuex-localstorage-sync"
    ]
}
```

```js
// store/index.js
export const state = ()=> ({
    counter: 0
});

export const mutations = {
    counterFromStorage: (state, delta)=>
        state.counter += delta;
};
```

This is all the setting up you will need. Export a state named anything you want. Then for the plugin to synchronize that state in localstorage you will need to export a mutation that starts with the name of the state (exactly written the same as the state export) and append it with "FromStorage". The "FromStorage" part is ***not*** Case-Sensitive. The plugin wil also work if you have different namespaced store files without any extra work.

I can't ensure the plugin will work with project setups that differ a lot from a "basic" nuxt project.