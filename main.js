document.addEventListener('DOMContentLoaded', function() {
    loadItem();
    resizeTextbox();
})

// load items data from google sheets
async function loadItem() {
    try {
        const spreadsheetId = '1vcItq-vwIjsCMrcGKa111moXmEU4usUkS_BjQYTlcgk';
        const sheetName = 'Items';
        const url = `https://opensheet.elk.sh/${spreadsheetId}/${sheetName}`;

        const response = await fetch(url);
        const data = await response.json();
        
        // loop through each item
        data.forEach(row => {
            const itemId = row['ID'];
            const itemName = row['Item Name'];
            const category = row['Category'];
            const quantity = parseInt(row['Quantity']);

            let categoryDiv = document.getElementById(category);
            
            // checking whether the section exist or not, if not then add section
            if (!categoryDiv) {
                categoryDiv = document.createElement('div');
                categoryDiv.id = category;
                
                // add category name
                const categoryHeader = document.createElement('h3');
                categoryHeader.textContent = category;

                categoryDiv.appendChild(categoryHeader);

                // add whole category to body
                itemsDiv = document.getElementById('items')
                itemsDiv.appendChild(categoryDiv);
            }

            // add item checkbox
            const itemCheckBox = document.createElement('input');
            itemCheckBox.type = 'checkbox';
            itemCheckBox.className = 'checkbox';
            itemCheckBox.id = itemId;
            itemCheckBox.value = itemName;
            itemCheckBox.onchange = function () {updateSummary()};

            // add item label
            const itemLabel = document.createElement('label');
            itemLabel.appendChild(itemCheckBox);
            itemLabel.appendChild(document.createTextNode(itemName));

            categoryDiv.appendChild(itemLabel);

            // add quantity select for some items
            if (quantity !== 0) {
                const decreaseButton = document.createElement('button');
                decreaseButton.className = 'quantityButton';
                decreaseButton.onclick = function() {changeQuantity(itemId, 'decrease', quantity)};
                decreaseButton.innerHTML = '-';

                const quantityCount = document.createElement('span');
                quantityCount.id = `quantity_${itemId}`;
                quantityCount.innerHTML = quantity;
                if (quantity === 10) {quantityCountSpecificId = quantityCount.id}; // specific case

                const increaseButton = document.createElement('button');
                increaseButton.className = 'quantityButton';
                increaseButton.onclick = function () {changeQuantity(itemId, 'increase', quantity)};
                increaseButton.innerHTML = '+';

                categoryDiv.appendChild(decreaseButton);
                categoryDiv.appendChild(quantityCount);
                categoryDiv.appendChild(increaseButton);
            }

            // new line
            categoryDiv.appendChild(document.createElement('br'));
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

// load last save data from google sheets
async function loadData() {
    const spreadsheetId = '1vcItq-vwIjsCMrcGKa111moXmEU4usUkS_BjQYTlcgk';
    const sheetName = 'Form Responses 1';
    const url = `https://opensheet.elk.sh/${spreadsheetId}/${sheetName}`;

    const response = await fetch(url);
    const data = await response.json();

    const inputTextarea = document.getElementById('Input');

    inputTextarea.value = data[data.length - 1]['Input'];

    changeTextboxHeight();
}

// set height of both textboxes in summary area to be max number of input lines among both textboxes
function changeTextboxHeight() {
    const inputTextarea = document.getElementById('Input');
    const summaryTextarea = document.getElementById('Summary');
    const inputLines = inputTextarea.value.split('\n').length;
    const summaryLines = summaryTextarea.value.split('\n').length;
    
    inputTextarea.rows = Math.max(inputLines, summaryLines) + 3;
    summaryTextarea.rows = Math.max(inputLines, summaryLines) + 3;
}

// set textbox to dynamically change height based on number of input items
function resizeTextbox() {
    const allTextarea = document.querySelectorAll('.textarea-summary');

    allTextarea.forEach(textarea => {
        textarea.addEventListener('input', function() {changeTextboxHeight()});
    })
}

// changing checkboxes and quantity based on input textbox
function selectItems() {
    // reset all checkboxes and quantity
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const quantityCountAll = document.querySelectorAll('span');

    checkboxes.forEach(checkbox => checkbox.checked = false);
    quantityCountAll.forEach(quantityCount => quantityCount.innerHTML = 1);
    document.getElementById(quantityCountSpecificId).innerHTML = 10; // specific case

    // selecting checkboxes based on input
    const inputValue = document.getElementById('Input').value;
    const items = inputValue.split('\n');

    items.forEach(item => {
        let match = item.trim().match(/^(.*?)(?:\s*\((\d+)\))?$/);

        if (match) {
            let itemName = match[1];
            let count = match[2];

            // specific case
            if (itemName.endsWith('0 kg')) {
                [itemName, count, _] = itemName.split(' ');
            }

            // set checkbox
            checkboxes.forEach(checkbox => {
                if (checkbox.value === itemName) {
                    checkbox.checked = true;

                    // set quantity
                    itemId = checkbox.id;
                    quantityCountElement = document.getElementById(`quantity_${itemId}`);

                    if (quantityCountElement && count >= 1) {
                        quantityCountElement.innerHTML = count;
                    }

                    return;
                }
            })
        }
    })

    updateSummary();
}

// ticking checkbox and update summary textbox
function updateSummary() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const summaryTextarea = document.getElementById('Summary');
    let summaryValue = '';

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            itemId = checkbox.id;
            quantityCountElement = document.getElementById(`quantity_${itemId}`);

            if (quantityCountElement) {
                quantityCount = parseInt(quantityCountElement.innerHTML);

                if (quantityCount % 10 === 0){
                    summaryValue += checkbox.value + ` ${quantityCount} kg` + '\n'; // for fresh chicken only
                } else if (quantityCount !== 1) {
                    summaryValue += checkbox.value + ` (${quantityCount})` + '\n';
                } else {
                    summaryValue += checkbox.value + '\n';
                }
            } else {
                summaryValue += checkbox.value + '\n';
            }
        }
    })

    summaryValue = summaryValue.trimEnd();
    summaryTextarea.value = summaryValue;

    changeTextboxHeight();
}

// change quantity when press minus or plus button
function changeQuantity(itemId, change, quantity) {
    quantityCount = document.getElementById(`quantity_${itemId}`)
    
    if (change === 'decrease') {
        quantityCountUpdated = parseInt(quantityCount.innerHTML) - quantity
        
        // prevent quantity less than one
        if (quantityCountUpdated > 0) {
            quantityCount.innerHTML = parseInt(quantityCount.innerHTML) - quantity
        }
        
    } else if (change === 'increase') {
        quantityCount.innerHTML = parseInt(quantityCount.innerHTML) + quantity
    }

    updateSummary();
}

// copy all text in summary textbox
function copyToClipboard() {
    const summary = document.getElementById('Summary');

    navigator.clipboard.writeText(summary.value);
}