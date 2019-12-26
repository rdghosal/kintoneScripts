/* 
Kintone code for a search bar that queries using fuzzy matching.
Displays during the table view of the app.
*/

kintone.events.on("app.record.index.show", event => {
    // Grab first records and read its fieldnames
    const records = event.records;
    const fields = Object.keys(records[0]);

    // Create a <select> element to pick a field for query
    const fieldSelector = document.createElement("select");
    fields.forEach(field => fieldSelector.options.add(field));
    
    const searchButton = document.createElement("button");
    searchButton.innerHTML = "Click me!";

    // Create a <input> element to allow text input (searchbar)
    const searchBar = document.createElement("input");
    searchBar.setAttribute("type", "test");
    searchBar.setAttribute("placeholder", "Type something!");
    searchBar.setAttribute("autofocus", "on");
    searchBar.setAttribute("autocomplete", "on");

    // Get target field 
    const targetField = fieldSelector.value
    const query = searchBar.value
    searchButton.onclick = searchRecords(targetField, query, records);
});

const searchRecords = (field, query, records) => {
    const filteredRecords = records.filter(record => filterRecords(field, query, record) )
    // TODO: process filteredRecords
}

const filterRecords = (field, query, record) => {
    let foundMatch = false;
    if (typeof record[field] === "string") {
        // Fuzzy matching for type string
        const index = record[field].indexOf(query);
        if (index > -1) {
            foundMatch = true;
        }
    } else if (typeof record[field] === "number") {
        // Hard matching for type number
        if (record[field] === query) {
            foundMatch = true;
        }
    }
    return foundMatch;
}  