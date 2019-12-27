/* 
Kintone code for a search bar that queries using fuzzy matching.
Displays during the table view of the app.
*/
kintone.events.on("app.record.index.show", function(event){
    // Fetch all records and render new HTML elements once
    if (document.getElementById("field-selector") === null) {
        const menuSpace = kintone.app.getHeaderMenuSpaceElement();
        // Create a loading message
        const loadingMessage = document.createElement("div")
        loadingMessage.setAttribute("style", "color: red;")
        loadingMessage.innerHTML = "検索ボックスを読み込み中・・・"
        menuSpace.appendChild(loadingMessage);

        fetchRecords().then(records => {
            // Grab fieldnames from first record
            const fields = Object.keys(records[0]);
            menuSpace.removeChild(loadingMessage);
            makeSearchBar(fields, menuSpace);
            document.getElementById("search-button").addEventListener("click", () => searchRecords(records));
        });
    }
});

async function fetchRecords(lastRecordId, records) {
    /* 
    * An async version of the seek method proposed here:
    * https://developer.kintone.io/hc/en-us/articles/360014037114
    */

    // Array of all records to be populated recursively
    let allRecords = records || [];
    let query = lastRecordId ? "$id > " + lastRecordId : "";
    query += " order by $id asc limit 500";

    const params = {
        app: kintone.app.getId(),
        query: query
    }

    const response = await kintone.api("/k/v1/records", "GET", params);
    allRecords = allRecords.concat(response.records);
    if (response.records.length === 500) {
        return fetchRecords(response.records[response.records.length - 1].$id.value, allRecords);
    } 

    return allRecords;
}

function makeSearchBar(fields, menuSpace) {
    /* 
    * Creates new HTML elements composing searchbar 
    */    
    // Create a <select> element to pick a field for query
    const fieldSelector = document.createElement("select");
    fieldSelector.setAttribute("id", "field-selector");
    // Add selected fields as search options
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
    menuSpace.appendChild(fieldSelector);
    menuSpace.appendChild(searchBar);
    menuSpace.appendChild(searchButton);
    menuSpace.appendChild(helpButton);
}

function searchRecords(records) {
    /* 
    * Searches for matching records and resolves 
    * by opening search result views for each match
    */
    const field = document.getElementById("field-selector").value;
    const query = document.getElementById("search-bar").value;
    let minLength = (field === "登録日付") ? 6 : 3; // Dates should be yyyy/m at least
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
    /* 
    * Provides fuzzy matching for strings,
    * whereas strict matching used for numbers
    */
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