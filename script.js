document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('add-row').addEventListener('click', addRow);
  document.getElementById('calculate').addEventListener('click', rebalancePortfolio);
  document.getElementsByClassName('position').item(0).addEventListener('input', updateCurrentAllocations);
});

function updateCurrentAllocations() {
  const positions = getPositions();
  const total = positions.reduce((acc, val) => acc + val, 0);
  const allocations = positions.map(pos => total ? (pos / total) * 100 : 0);
  displayCurrentAllocations(allocations);
}

function updateNewAllocations(nextPurchases) {
  const positions = getPositions();
  const total = positions.reduce((acc, val) => acc + val, 0) + getNextPurchase();
  const newAllocations = positions.map((pos, index) => total ? ((pos + nextPurchases[index]) / total) * 100 : 0);
  displayNewAllocations(newAllocations);
}

function addRow() {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="number" class="position" placeholder="$"></td>
    <td><label class="current-allocation result">0.00%</label></td>
    <td><input type="number" class="allocation" placeholder="%"></td>
    <td><label class="next-purchase result">$0</label></td>
    <td><label class="new-allocation result">0.00%</label></td>
    <td><button type="button" class="delete-row">X</button></td>
  `;
  row.querySelector('.delete-row').addEventListener('click', () => {
    row.remove();
    updateCurrentAllocations();
  });
  row.querySelector('.position').addEventListener('input', updateCurrentAllocations);
  document.getElementById('rows-container').appendChild(row);
}

function getRows() {
  return document.querySelectorAll('#rows-container tr');
}

function getPositions() {
  return Array.from(getRows()).map(row => Number(row.querySelector('.position').value) || 0);
}

function getDesiredAllocations() {
  return Array.from(getRows()).map(row => Number(row.querySelector('.allocation').value) || 0);
}

function getNextPurchase() {
  return Number(document.getElementById('next-purchase').value) || 0;
}

function addErrorClass(querySelector) {
  Array.from(document.querySelectorAll(querySelector)).forEach(input => {
    input.classList.add('error-border');
  });
}

function unsetError() {
  Array.from(document.querySelectorAll('.error-border')).forEach(input => {
    input.classList.remove('error-border');
  });
}

function checkPositions() {
  return getPositions().every(pos => Number.isInteger(pos) && pos >= 0 && pos <= 1000000000);
}

function checkTargetAllocations() {
  const allocations = getDesiredAllocations();
  let total = 0;

  allocations.forEach(alloc => {
    if (!Number.isInteger(alloc) || alloc < 0 || alloc > 100) {
      return false;
    }
    total += alloc;
  });

  return total === 100;
}

function checkNextPurchase() {
  return Number.isInteger(getNextPurchase()) && getNextPurchase() >= 0 && getNextPurchase() <= 1000000000;
}

function rebalancePortfolio() {

  if (checkPositions() === false) {
    addErrorClass('.position');
    alert('Positions must be an integer greater than 0 and less than $1,000,000,000');
    return;
  }

  if (checkTargetAllocations() === false) {
    addErrorClass('.allocation');
    alert('Target allocations must be integers between 0 and 100 and sum to 100');
    return;
  }

  if (checkNextPurchase() === false) {
    addErrorClass('#next-purchase');
    alert('Next purchase must be an integer greater than 0 and less than $1,000,000,000');
    return;
  }

  unsetError();

  const positions = getPositions();
  const desiredAllocations = getDesiredAllocations();
  const nextPurchase = getNextPurchase();

  const currentTotal = positions.reduce((acc, val) => acc + val, 0);
  const currentAllocations = positions.map(pos => currentTotal ? (pos / currentTotal) * 100 : 0);
  displayCurrentAllocations(currentAllocations);
  
  const newTotal = nextPurchase + currentTotal;
  const desiredPositions = getDesiredPositions(newTotal, desiredAllocations);
  const deviations = desiredPositions.map((pos, index) => pos - positions[index]);

  const underweightDeviations = deviations
    .map((deviation, index) => ({ deviation, index }))
    .filter(item => item.deviation >= 0);

  let nextPurchases = Array(positions.length).fill(0);

  if (underweightDeviations.length === deviations.length) {
    nextPurchases = underweightDeviations.map(item => item.deviation);
  } else if (underweightDeviations.length > 0) {
    nextPurchases = getPartialRebalancePurchases(nextPurchase, underweightDeviations, positions.length);
  }

  displayNextPurchases(nextPurchases);
  updateNewAllocations(nextPurchases);
}


function getPartialRebalancePurchases(remainingPurchase, underweightDeviations, numberOfPositions) {
  const nextPurchases = new Array(numberOfPositions).fill(0);
  const sortedDeviations = underweightDeviations.sort((a, b) => b.deviation - a.deviation);

  while (remainingPurchase > 0 && sortedDeviations.length > 0) {
    const maxDeviation = sortedDeviations[0].deviation;
    const maxDeviationIndices = sortedDeviations
      .filter(item => item.deviation === maxDeviation)
      .map(item => item.index);

    maxDeviationIndices.forEach(index => {
      if (remainingPurchase > 0) {
        nextPurchases[index] += 1;
        remainingPurchase -= 1;
        sortedDeviations.find(item => item.index === index).deviation -= 1;
      }
    });

    sortedDeviations.sort((a, b) => b.deviation - a.deviation);
  }
  return nextPurchases;
}

function getDesiredPositions(totalValue, desiredAllocations) {
  let remainingPurchase = totalValue;
  const positions = Array(desiredAllocations.length).fill(0);

  desiredAllocations.forEach((alloc, index) => {
    positions[index] = Math.min(
      remainingPurchase,
      Math.max(1, Math.round(alloc / 100 * totalValue))
    );

    remainingPurchase -= positions[index];
  });

  return positions;
}

function displayNextPurchases(nextPurchases) {
  getRows().forEach((row, index) => {
    row.querySelector('.next-purchase').textContent = `$${nextPurchases[index]}`;
  });
}

function displayCurrentAllocations(currentAllocations) {
  getRows().forEach((row, index) => {
    row.querySelector('.current-allocation').textContent = currentAllocations[index].toFixed(2) + '%';
  });
}

function displayNewAllocations(newAllocations) {
  getRows().forEach((row, index) => {
    row.querySelector('.new-allocation').textContent = newAllocations[index].toFixed(2) + '%';
  });
}