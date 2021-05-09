import { createFetch } from "./sharedFetch";
import {
    DestinyManifestComponentName,
    getDestinyManifest,
} from "bungie-api-ts/destiny2";
import * as localForage from "localforage";

const indexedConfig = {
    driver: localForage.INDEXEDDB,
    name: "manifest",
    version: 1,
};
const checkStore = localForage.createInstance({
    ...indexedConfig,
    storeName: "version_check",
});
const manifestStore = localForage.createInstance({
    ...indexedConfig,
    storeName: "component_definitions",
});

const componentList: DestinyManifestComponentName[] = [
    "DestinyVendorDefinition",
    "DestinyVendorGroupDefinition",
    "DestinyDestinationDefinition",
    "DestinyObjectiveDefinition",
];

/**
 * Checks the stored manifest versions and if necessary updates them
 */
export const storeManifest = async (
    setLoadingState?: (loading: boolean) => void
) => {
    const destinyManifest = await getDestinyManifest(createFetch());
    const manifestJson = destinyManifest.Response.jsonWorldContentPaths.en;
    // Update all tables if not running with the current version.
    // Otherwise check for missing tables and update only if necessary.
    const updateAll = !(await isCurrentVersion(manifestJson));
    const manifestJsonComponents =
        destinyManifest.Response.jsonWorldComponentContentPaths.en;

    componentList.forEach(async (component) => {
        if ((await isTableDeleted(component)) || updateAll) {
            const endPoint = manifestJsonComponents[component];
            const response = await fetch(`https://www.bungie.net${endPoint}`);
            const data = await response.json();
            manifestStore.setItem(component, data);
        }
    });

    setLoadingState(false);
};

/**
 * Checks if the stored and manifests aggregate json endpoint are the same.
 * If false updates the db.
 * @param manifestJson The manifests endpoint
 * @returns true if stored and manifest are the same; otherwise false
 */
const isCurrentVersion = async (manifestJson: string) => {
    const storedJson = await checkStore.getItem("ver");
    if (storedJson !== manifestJson) {
        //update stored version
        checkStore.setItem("ver", manifestJson);
        return false;
    }
    return true;
};

/**
 * Checks if a component table exists in the db.
 * @param component The component name to search for
 * @returns true if the table doesn't exist; otherwise false
 */
const isTableDeleted = async (component: string) => {
    const item = await manifestStore.getItem(component);
    return item === null;
};
