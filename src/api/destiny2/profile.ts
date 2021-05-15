import {
    BungieMembershipType,
    DestinyCharacterComponent,
    DestinyComponentType,
    DestinyProfileUserInfoCard,
    getLinkedProfiles,
    getProfile,
    DictionaryComponentResponse,
} from "bungie-api-ts/destiny2";
import { getDestinyClassDefinition } from "api/utils/manifest_stores";
import { authStorage, createFetch } from "api/utils";
import type {
    IAuthToken,
    IDestinyCharacterComponentOverride,
} from "api/utils/types";
import { writable } from "svelte/store";

const bngBaseUrl = "https://www.bungie.net";

/**
 * Fetches the BNet profile information
 * @returns The profile as IBnetProfile
 */
export const fetchProfile = async (): Promise<DestinyProfileUserInfoCard> => {
    const membershipId = (await authStorage.getItem<IAuthToken>("token"))
        .bungieMembershipId;
    const response = await getLinkedProfiles(createFetch(), {
        membershipType: BungieMembershipType.BungieNext,
        membershipId,
        getAllMemberships: false,
    });

    const profile = {
        ...response.Response.profiles[0],
        iconPath: bngBaseUrl + response.Response.bnetMembership.iconPath,
    };

    // With getAllMemberships=false only one profile is returned
    return profile;
};

/**
 * Fetches the character information.
 * @param destinyMembershipId The membershipId fetched from the linkedProfile endpoint.
 * @param membershipType The membershipType fetched from the linkedProfile endpoint.
 * @returns The response of the getProfile endpoint.
 */
export const fetchResolvedCharacters = async (
    destinyMembershipId: string,
    membershipType: BungieMembershipType
) => {
    const response = await getProfile(createFetch(true), {
        destinyMembershipId,
        membershipType,
        components: [
            DestinyComponentType.Characters,
            DestinyComponentType.CharacterInventories,
            DestinyComponentType.CharacterProgressions,
        ],
    });

    const characters = await resolveCharacters(response.Response.characters);

    const inventoryItems = response.Response.characterInventories.data;
    const progressions = response.Response.characterProgressions.data;

    return { characters, inventoryItems, progressions };
};

const resolveCharacters = async (
    characters: DictionaryComponentResponse<DestinyCharacterComponent>
): Promise<IDestinyCharacterComponentOverride[]> => {
    const resolvedCharacters = [];
    for (const characterId in characters.data) {
        const element = characters.data[characterId];
        const className = (await getDestinyClassDefinition())[element.classHash]
            .displayProperties.name;
        resolvedCharacters.push({
            ...element,
            class: className,
            emblemPath: bngBaseUrl + element.emblemPath,
            emblemBackgroundPath: bngBaseUrl + element.emblemBackgroundPath,
        });
    }
    return resolvedCharacters;
};

export const createSelectedCharacterStore = (
    character?: IDestinyCharacterComponentOverride
) => writable(character);

export const selectedCharacter = writable<IDestinyCharacterComponentOverride>(
    undefined
);
