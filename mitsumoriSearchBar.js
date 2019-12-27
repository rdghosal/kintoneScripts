/* 
Kintone code for a search bar that queries using fuzzy matching.
Displays during the table view of the app.
*/

kintone.events.on("app.record.index.show", event => {
    // Grab first records and read its fieldnames
    // const appId = kintone.app.getId();
    const records = event.records;
    const fields = Object.keys(records[0]);

    if (document.getElementById("search-bar") === null) {
        // Create a <select> element to pick a field for query
        const fieldSelector = document.createElement("select");
        fieldSelector.setAttribute("id", "field-selector");

        // Add each field as a search option
        fields.forEach(field => {
            if (field.indexOf("$") === -1 && field.indexOf("者") === -1 
                && field.indexOf("日時") === -1) {
                const option = document.createElement("option");
                if (field === "プロジェクト名称") {
                    option.selected = true; // Select default
                }
                option.innerHTML = field;
                fieldSelector.appendChild(option);
            }
        });
        
        // Create a <input> element to allow text input (searchbar)
        const searchBar = document.createElement("input");
        searchBar.setAttribute("type", "test");
        searchBar.setAttribute("id", "search-bar");
        searchBar.setAttribute("placeholder", "キーワード入力");
        searchBar.setAttribute("autofocus", "on");
        searchBar.setAttribute("autocomplete", "on");

        // Make button that initiates search algorithm upon click
        const searchButton = document.createElement("button");
        searchButton.innerHTML = "検索";
        searchButton.id = "search-button";

        // Add a help button
        const helpButton = document.createElement("button");
        helpButton.innerHTML = "Help";
        helpButton.onclick = () => alert("フィールドを選択し、キーワードを検索してください。");

        // Grab space in app and insert new DOM elements
        const menuSpace = kintone.app.getHeaderMenuSpaceElement();
        menuSpace.appendChild(fieldSelector);
        menuSpace.appendChild(searchBar);
        menuSpace.appendChild(searchButton);
        menuSpace.appendChild(helpButton);
    }
    document.getElementById("search-button").addEventListener("click", () => searchRecords(records));
});

function searchRecords(records) {
    const field = document.getElementById("field-selector").value;
    const query = document.getElementById("search-bar").value;
    let minLength = (field === "登録日付") ? 6 : 2;
    if (query.length < minLength || query.indexOf(" ") > -1 || query.indexOf("　") > -1) {
        return alert(`${minLength}文字以上かつ空白抜きのクエリ―で検索してください`);
    }

    const filteredRecords = records.filter(record => {
        return filterRecords(field, query, record);
    });

    // Parse current URL 
    let baseUrl = window.location.href;
    const end = baseUrl.indexOf(".com") + 5; // Takes up to forward slash
    baseUrl = baseUrl.slice(0, end); 

    // Make query string for each record
    // navigate to each found record each as separate search result
    filteredRecords.forEach(rec => {
        window.open(baseUrl + `/k/search?keyword=${encodeURIComponent(rec[field].value)}&sortOrder=DATETIME&app=${kintone.app.getId()}`);
    });
}

function filterRecords(field, query, record) {
    let foundMatch = false;
    if (typeof record[field].value === "string") {
        // Fuzzy matching for type string
        const index = record[field].value.toLowerCase().indexOf(query.toLowerCase());
        if (index > -1) {
            foundMatch = true;
        }
    } else if (typeof record[field].value === "number") {
        // Hard matching for type number
        if (record[field].value === query) {
            foundMatch = true;
        }
    }
    return foundMatch;
}  