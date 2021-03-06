/* 
* Kintone JavaScript API code that renders an additional search bar 
* capable of loading all record data and fuzzing matching queries thereagainst
* Matched records are listed as a table on a separate tab,
* including links to view each matched record.
*/

kintone.events.on("app.record.index.show", function(event){
    /*
    * Builds a searchbar after retrieving all records in app,
    * the button and input field thereof calling relevant functions for fuzzy matching and outputing a results table
    */
    // Fetch all records and render new HTML elements once
    if (document.getElementById("field-selector") === null) {
        // Grab space for new HTML els and insert a loading message        
        const menuSpace = kintone.app.getHeaderMenuSpaceElement();
        const loadingMessage = document.createElement("div");
        loadingMessage.setAttribute("style", "color: red; font-weight: bolder; font-size: 1.2rem;");
        loadingMessage.innerHTML = "検索ボックスを読み込み中・・・";
        menuSpace.appendChild(loadingMessage);

        fetchRecords().then(records => {
            // Grab fieldnames from first record
            const fields = Object.keys(records[0]);
            menuSpace.removeChild(loadingMessage); // Destroy message for new els
            makeSearchBar(fields, menuSpace);
            // Add event listeners for search and result output
            document.getElementById("search-button").addEventListener("click", () => searchRecords(records));
            document.getElementById("search-bar").addEventListener("keypress", event => {
                if (event.keyCode === 13) {
                    searchRecords(records);
                }
            });
        });
    }
});

async function fetchRecords(lastRecordId, records) {
    /* 
    * An async version of the seek method presented here:
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
    helpButton.onclick = () => alert("対象フィールドを選択、キーワードを入力してから、\nデータ検索を行なってください。");

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
    let minLength = (field === "登録日付") ? 6 : 2; // Dates should be yyyy/m at least
    if (query.length < minLength) {
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
    const results = new Array();

    // Grab a list of options in the <select> el we made
    const selectOptions = document.getElementById("field-selector").options;
    const options = new Array(selectOptions.length);
    for (let i = 0; i < selectOptions.length; i++) {
        options[i] = selectOptions[i].value;
    }

    filteredRecords.forEach(rec => {
        // Create a results object to memoize data to be tabulated
        // and add a new field to
        let result = {};
        options.forEach(opt => { result[opt] = rec[opt]; });
        // pick a known string to make into URL rather than object
        let toUrl = (typeof rec[field].value === "object") ? rec["プロジェクト名称"].value : rec[field].value;
        result["結果URL"] = baseUrl + `/k/search?keyword=${encodeURIComponent(toUrl)}&sortOrder=DATETIME&app=${kintone.app.getId()}`;
        results.push(result);
    });

    makeResultsTable(field, query, results);
}

function filterRecords(field, query, record) {
    /* 
    * Provides fuzzy matching for strings after checking record data type
    */
    // Check if record data is subtable
    if (typeof record[field].value === "object") {
        return verifyTableData(query, record[field].value[0]);
    }
    // If not a subtable, verify record data as is
    return verifyRecordData(query, record[field]);
}  

function verifyTableData(query, rowData) {
    /*
    * Parses and verfies tabular data
    */
    let foundMatch = false;
    const subFields = Object.keys(rowData.value);
    // Check data in each field of table
    subFields.forEach(subField => {
        let subRecordData = rowData.value[subField];
        if (verifyRecordData(query, subRecordData)) {
            foundMatch = true;
        }
    });
    return foundMatch
}

function verifyRecordData(query, recordData){
    /*
    * Verification algorithm that ensure fuzzy matching for string data
    */ 
    let foundMatch = false;
    if (typeof recordData.value === "string") {
        // Fuzzy matching for type string
        const index = recordData.value.toLowerCase().indexOf(query.toLowerCase());
        if (index > -1) {
            foundMatch = true;
        }
    } else if (typeof recordData.value === "number") {
        // Hard matching for type number
        if (recordData.value === query) {
            foundMatch = true;
        }
    }
    return foundMatch;
}

function makeResultsTable(field, query, results) {
    /* 
    * Displays search results as table on separate tab 
    */
    // Check if search failed
    if (!results[0]) {
        alert("レコードが見つかりませんでした。\nクエリまたは選択したフィールドを再確認の上、検索してください。")
        return false;
    }

    // Metadata and Bootstrap import
    let html = "<!DOCTYPE html><html xmlns='http://www.w3.org/1999/xhtml'><head><meta charset = 'utf-8'/>\
                <title id='title'>kintone | 検索結果</title><link rel='stylesheet' href='https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css' \
                integrity='sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T' crossorigin='anonymous'></head><body>";
    let headers = Object.keys(results[0]);
    headers = headers.filter(header => header.indexOf("案件") === -1 && header.indexOf("レコード") === -1 && header !== "添付ファイル");

    // Display query
    html += `<div id="container"><h1 style="text-align:center;">\
            FIELD: <span class="search-info">${field}</span> | QUERY: <span class="search-info">${query}</span></h1>`;
    html += `<p><span style="font-weight:bold;">${results.length}個</span>のレコードが見つかりました。</p>`;

    // Start table
    html += "<table class='table table-striped table-hover'><thead class='thead-dark'>";

    // Add headers
    for (let i = 0; i < headers.length; i++) {
        let th = `<th scope='col'>${headers[i]}</th>`;
        html += th;
    }
    // Close table headers
    html += "</thead><tbody>";

    // Add record data as row
    for (let j = 0; j < results.length; j++) {
        let tr = "<tr>";
        // Fill each column of row with table data
        for (let k = 0; k < headers.length; k++) {
            let td = `<td>${getCellData(results[j], headers[k])}</td>`;
            tr += td;
        }
        tr += "</tr>"
        html += tr;
    }
    // Close html and write to new tab
    html += "</tbody></table></div></body></html>";
    const newWindow = window.open("", "", "", false);
    newWindow.document.write(html);
    formatTable(newWindow.document);
    newWindow.document.close(); // Close data stream
}

function getCellData(result, header) {
    /* 
    * Gets and formats data to be displayed from records
    */
    let data = undefined;
    if (header === "結果URL") {
        data = `<a href="${result[header]}" target=_blank>リンク</a>`;
    } else if (header === "顧客情報") {
        // Grab customer data via access to particular columns of first row
        const customersCompanyName = result[header].value[0].value["顧客情報_企業"].value;
        const customersName = result[header].value[0].value["顧客情報_担当者氏名"].value;
        const customersEmail = result[header].value[0].value["顧客情報_担当者Mail"].value;
        // Format cell
        data = customersCompanyName + "<br>" + `<a href="mailto:${customersEmail}">${customersName}</a>`;
    } else {
        data = result[header].value;
    }
    //change here if changing undefined val view <td scope='row'></th>
    if (!data) {
        data = "-";
    }
    return data;
}

function formatTable(htmlDoc) {
    /* 
    * Formats the body, title, and table of the result tab 
    */
    // Format styling
    const html = htmlDoc.getElementsByTagName("html")[0];
    html.setAttribute("style", "width: 100vw;");

    const body = htmlDoc.getElementsByTagName("body")[0];
    body.setAttribute("style", "display: flex; justify-content: center; width: 100%; background-color:#333;");

    const h1 = htmlDoc.getElementsByTagName("h1")[0];
    h1.setAttribute("style", "margin-bottom: 1rem; text-align: center;");

    const h1Spans = html.getElementsByClassName("search-info");
    for (let i = 0; i < h1Spans.length; i++) {
        h1Spans[i].setAttribute("style", "font-size: 1.75rem;");
    }

    const p = htmlDoc.getElementsByTagName("p")[0];
    p.setAttribute("style", "text-align: center; margin-bottom: 2rem; font-size: 1.1rem;");

    const container = htmlDoc.getElementById("container");
    container.setAttribute("style", "width: 75%; background-color: white; padding: 2rem 5rem;");
}
