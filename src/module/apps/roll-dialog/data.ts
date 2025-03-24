import { SocketRollRequest } from "../types.ts";

const testRequest: SocketRollRequest = {
    id: "test-request",
    users: [],
    type: "roll-request",
    groups: [
        {
            id: "kzElF0lYZQuT9jGh",
            rolls: [
                {
                    dc: 25,
                    id: "SckiMfnI3sAgDE19",
                    traits: [],
                    slug: "perception",
                    type: "check",
                    label: "Test Label ($s)",
                },
                {
                    dc: 20,
                    id: "6mdcCvb3fy6izUtc",
                    traits: [],
                    slug: "athletics",
                    type: "check",
                },
                {
                    dc: 10,
                    id: "TjWDyujPBVBE81iq",
                    slug: "aid",
                    statistic: "perception",
                    type: "action",
                },
            ],
            title: "Test Group 1",
        },
        {
            id: "k4PCPajsVoCB1wFG",
            rolls: [
                {
                    dc: 20,
                    id: "ebdy6gxpYC57Bll7",
                    slug: "climb",
                    statistic: "athletics",
                    type: "action",
                },
                {
                    dc: 25,
                    id: "RIoynSxbq7f7Jm38",
                    slug: "fly",
                    type: "action",
                },
                {
                    dc: 20,
                    id: "kuDTNKVt6P27fv1J",
                    traits: [],
                    slug: "reflex",
                    type: "check",
                },
            ],
            title: "Test Group 2",
        },
    ],
};

export { testRequest };
