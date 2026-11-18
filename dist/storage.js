// Preferences may be ephemeral when the browser blocks storage; gameplay must still load.
// Session storage deliberately reports errors so the UI can warn about unsaved progress.
export const preferences={
 getItem(key){try{return globalThis.localStorage.getItem(key)}catch{return null}},
 setItem(key,value){try{globalThis.localStorage.setItem(key,value)}catch{}}
};
export const sessionStorageAdapter={getItem:key=>globalThis.localStorage.getItem(key),setItem:(key,value)=>globalThis.localStorage.setItem(key,value)};
