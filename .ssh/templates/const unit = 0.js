const unit = 1;
const max = 365;
let csv = "";

for(let i = 0; i <= max; i += unit) {
    if(i % 10 == 0) 
        csv += "\n";
    else
     csv += "\t";

    csv += (i / 100).toFixed(2);
}

console.log(csv.replaceAll(".", ","))