async function fetchCategoryItems(selectedCategoryElement) {
    const selectedCategory = selectedCategoryElement.value
    const insertAfterElement = document.getElementById('insert');

    if (!selectedCategory) {
        insertAfterElement.innerHTML = '<option value="">Select Category First</option>';
        insertAfterElement.disabled = true;
        return;
    }

    insertAfterElement.disabled = true;

    try {
        const spreadsheetId = '1vcItq-vwIjsCMrcGKa111moXmEU4usUkS_BjQYTlcgk';
        const sheetName = 'Items';
        const url = `https://opensheet.elk.sh/${spreadsheetId}/${sheetName}`;

        const response = await fetch(url);
        const data = await response.json();

        const filteredOptions = data.filter(row => row['Category'] === selectedCategory);

        insertAfterElement.innerHTML = '<option value="">Select</option>';

        filteredOptions.forEach(row => {
            const option = document.createElement('option');
            option.value = row['Item Name'];
            option.textContent = row['Item Name'];
            insertAfterElement.appendChild(option);
        })

        insertAfterElement.disabled = false;

        updateHiddenInput(selectedCategoryElement);
    } catch (error) {
        console.error('Error:', error);
    }
}

function updateHiddenInput(selectElement) {
    const hiddenInput = document.getElementById(`${selectElement.id}-hidden`)

    hiddenInput.value = selectElement.value;
}