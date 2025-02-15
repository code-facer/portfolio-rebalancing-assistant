document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('add-row').addEventListener('click', addRow);
  document.getElementById('investment-form').addEventListener('input', rebalancePortfolio);
  rebalancePortfolio();
});

function addRow() {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text" class="position" placeholder="Current Position"></td>
    <td><label class="current-allocation result">0%</label></td>
    <td><input type="text" class="allocation" placeholder="Target Allocation (%)"></td>
    <td><label class="next-purchase result">$0</label></td>
    <td><button type="button" class="delete-row">X</button></td>
  `;
  row.querySelector('.delete-row').addEventListener('click', () => {
    row.remove();
    rebalancePortfolio();
  });
  document.getElementById('rows-container').appendChild(row);
}

function rebalancePortfolio() {
  const rows = document.querySelectorAll('#rows-container tr');
  const positions = Array.from(rows).map(row => Number(row.querySelector('.position').value) || 0);
  const allocations = Array.from(rows).map(row => Number(row.querySelector('.allocation').value) || 0);
  const nextPurchase = Number(document.getElementById('next-purchase').value) || 0;
  let totalValue = positions.reduce((acc, val) => acc + val, 0);
  let currentAllocations = positions.map(pos => totalValue ? (pos / totalValue) * 100 : 0);
  let deviations = allocations.map((alloc, index) => alloc - currentAllocations[index]);

  rows.forEach((row, index) => {
    row.querySelector('.current-allocation').textContent = currentAllocations[index].toFixed(2) + '%';
  });

  let remainingPurchase = nextPurchase;
  const nextPurchases = new Array(rows.length).fill(0);

  while (remainingPurchase > 0) {
    const positiveDeviations = deviations
      .map((deviation, index) => ({ deviation, index }))
      .filter(item => item.deviation > 0)
      .sort((a, b) => b.deviation - a.deviation);

    if (positiveDeviations.length === 0) break;

    if (positiveDeviations.length === 1) {
      const maxDeviationIndex = positiveDeviations[0].index;
      const amountToAdd = Math.min(
        remainingPurchase,
        Math.max(1, Math.round(positiveDeviations[0].deviation * totalValue / 100))
      );

      nextPurchases[maxDeviationIndex] += amountToAdd;
      remainingPurchase -= amountToAdd;

      positions[maxDeviationIndex] += amountToAdd;
      totalValue += amountToAdd;
      currentAllocations = positions.map(pos => totalValue ? (pos / totalValue) * 100 : 0);
      deviations = allocations.map((alloc, index) => alloc - currentAllocations[index]);
    } else {
      const maxDeviation = positiveDeviations[0].deviation;
      const nextDeviation = positiveDeviations[1] ? positiveDeviations[1].deviation : 0;
      const maxDeviationIndex = positiveDeviations[0].index;

      const amountToAdd = Math.min(
        remainingPurchase,
        Math.max(1, Math.round((nextDeviation - maxDeviation) * totalValue / 100))
      );

      nextPurchases[maxDeviationIndex] += amountToAdd;
      remainingPurchase -= amountToAdd;

      positions[maxDeviationIndex] += amountToAdd;
      totalValue += amountToAdd;
      currentAllocations = positions.map(pos => totalValue ? (pos / totalValue) * 100 : 0);
      deviations = allocations.map((alloc, index) => alloc - currentAllocations[index]);
    }
  }

  if (remainingPurchase > 0) {
    const equalShare = Math.floor(remainingPurchase / rows.length);
    const remainder = remainingPurchase % rows.length;

    nextPurchases.forEach((_, index) => {
      nextPurchases[index] += equalShare;
    });

    for (let i = 0; i < remainder; i++) {
      nextPurchases[i] += 1;
    }
  }

  rows.forEach((row, index) => {
    row.querySelector('.next-purchase').textContent = `$${nextPurchases[index]}`;
  });
}

// Add delete button event listeners to all rows except the first one
document.querySelectorAll('#rows-container tr').forEach((row, index) => {
  if (index > 0) {
    row.querySelector('.delete-row').addEventListener('click', () => {
      row.remove();
      rebalancePortfolio();
    });
} else {
    row.querySelector('.delete-row').style.display = 'none'; // Hide the delete button for the first row
  }
});