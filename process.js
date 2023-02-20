const fs = require('fs');

const junk = [
    /365.bank, a. s., Dvořákovo nábrežie 4, 811 02 Bratislava/g,
    /Zapísaná v Obchodnom registri Okresného súdu Bratislava I, oddiel Sa, vl. č. 501\/B, IČO: 31 340 890, IČ DPH: SK7020000680/g,
    /UT_05_365 \(DOC__1676209633081\)/g,
    /Strana \d+\s+\/ \d+/g,
    /\[\]/g,
    /Dátum Opis transakcie Druh Suma \(EUR\) VS, KS, SŠ/g,
    /Dokument je informatívny, neslúži na právne účely/g
]

const desc = [
    {
        prop: 'date',
        regex: /(\d+. \d+. \d+)/g,
        mandatory: true
    },
    {
        prop: 'vsSsKs',
        regex: /\/VS\d*\/SS\d*\/KS\d*/g,
        mandatory: false,
        skip: true
    },
    {
        prop: 'iban',
        regex: /\w{2}\d+/g,
        mandatory: true
    },
    {
        prop: 'sender',
        regex: /.*/g,
        mandatory: true
    },
    {
        prop: 'amount',
        regex: /Zrealizovaná (-?[0-9 ]+,?[0-9]*)/g,
        mandatory: true
    },
    {
        prop: 'vs',
        regex: /VS\d+/g,
        mandatory: false
    },
    {
        prop: 'ks',
        regex: /KS\d+/g,
        mandatory: false
    }
];

function toCsvLine(record) {
    return `${record.date};${record.vsSsKs};${record.iban};${record.sender};${record.amount}\r\n`;
}

fs.readFile(process.argv[2], (err, data) => {
    if (err) {
        console.err(err);
        return;
    }

    var outputRecors = [];
    var record = Object.create(null);
    const lines = data.toString().split('\r\n');
    let currDescIndex = 0;
    for (let i = 0; i < lines.length; ++i) {
        const fileLine = lines[i];
        const currDesc = desc[currDescIndex];

        // Skip junk
        if (junk.find(j => [...fileLine.matchAll(j)][0])) {
            continue;
        }

        // Check delim
        if (currDescIndex !== 0) {
            const delimMatch = [...lines[i].matchAll(desc[0].regex)][0];
            if (delimMatch?.length > 0) {
                outputRecors.push(record);
                currDescIndex = 1;
                record = Object.create(null);
                setProp(delimMatch, record, desc[0]);
                continue;
            }
        }

        // Check value
        const valueMatch = [...lines[i].matchAll(currDesc.regex)][0];
        let skip = false;
        if (!valueMatch) {
            if (currDesc.skip) {
                skip = true;
            } else if (currDesc.mandatory) {
                console.error(`Error reading on line ${i} + ${currDesc.regex.toString()}`);
                return;
            }
        } else {
            setProp(valueMatch, record, currDesc);
        }

        if (skip) {
            i = Math.max(0, i - 1);
        }
        ++currDescIndex;
    }

    // trailer
    if (Object.keys(record).length > 0) {
        outputRecors.push(record);
    }

    fs.writeFile(`Export.csv`,
        outputRecors.map(r => toCsvLine(r)).join(''),
        err => err && console.error(err));
});

function setProp(match, record, currDesc) {
    let index = 0;
    if (match.length > 1) {
        index = match.length - 1;
    }
    record[currDesc.prop] = match[index];
}