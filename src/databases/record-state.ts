const RecordState = {
    New: "",
    Deleted: "Deleted",
    Complete: "Complete",
    Started: "Started",
    Downloading: "Downloading",
    NotFound: "Not Found",
    Invalid: "Invalid",
    Failed: "Failed",
}

const RecordStates = Object.getOwnPropertyNames(RecordState).map(x => {
    let dynamicKey = x as keyof typeof RecordState;
    return RecordState[dynamicKey];
});

const RecordStateMap = new Map(Object.getOwnPropertyNames(RecordState).map(x => {
    let dynamicKey = x as keyof typeof RecordState;
    return [RecordState[dynamicKey], x] as const;
}));

export {
    RecordState,
    RecordStates,
    RecordStateMap
}