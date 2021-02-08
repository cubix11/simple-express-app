#! /usr/bin/env node

const inquirer = require('inquirer');
const cmd = require('node-cmd');
const fs = require('fs');
const path = require('path');
let javascript_app,
    typescript_app,
    typescript_router,
    javascript_router;
function trimChar(string, charToRemove) {
    while(string.charAt(0)==charToRemove) {
        string = string.substring(1);
    }

    while(string.charAt(string.length-1)==charToRemove) {
        string = string.substring(0,string.length-1);
    }

    return string;
}
const options_code = {
    'Helmet': [
        {
            'ts': 'helmet @types/helmet',
            'js': 'helmet'
        },
        {
            'ts': "import helmet from 'helmet';",
            'js': "const helmet = require('helmet');"
        },
        "app.use(helmet());"
    ],
    'Cors': [
        {
            'ts': 'cors @types/cors',
            'js': 'cors'
        },
        {
            'ts': "import cors from 'cors';",
            'js': "const cors = require('cors');"
        },
        "app.use(cors({ origin: '|origin|' }));"
    ],
    'volleyball': [
        {
            'ts': 'volleyball',
            'js': 'volleyball'
        },
        {
            'ts': "import volleyball from 'volleyball';",
            'js': "const volleyball = require('volleyball');"
        },
        "app.use(volleyball)"
    ],
    'morgan': [
        {
            'ts': 'morgan @types/morgan',
            'js': 'morgan'
        },
        {
            'ts': "import morgan from 'morgan';",
            'js': "const morgan = require('morgan');"
        },
        "app.use(morgan('tiny'));"
    ],
    'Body parser': [
        {
            'ts': 'body-parser @types/body-parser',
            'js': 'body-parser'
        },
        {
            'ts': "import bodyParser from 'body-parser';",
            'js': "const bodyParser = require('body-parser');"
        },
        "app.use(bodyParser.urlencoded({ extended: true }));"
    ],
    'JSON payload (express.json())': [
        null,
        null,
        "app.use(express.json());"
    ]
};
console.log(__dirname)
function getFileData() {
    fs.readFile(path.join(__dirname, 'placeholders', 'javascript_app.txt'), 'utf-8', (err, data) => javascript_app = data);
    fs.readFile(path.join(__dirname, 'placeholders', 'javascript_router.txt'), 'utf-8', (err, data) => javascript_router = data);
    fs.readFile(path.join(__dirname, 'placeholders', 'typescript_app.txt'), 'utf-8', (err, data) => typescript_app = data);
    fs.readFile(path.join(__dirname, 'placeholders', 'typescript_router.txt'), 'utf-8', (err, data) => typescript_router = data);
};

getFileData();

async function prompt() {
    let { options, folder } = await inquirer.prompt([
        {
            type: 'input',
            name: 'folder',
            message: 'Where is the code going to go (ex: my-express-app)?',
            validate: input => {
                if(!input) return 'Please enter a folder';
                if(input.includes('.')) return 'Folders cannot contain dots';
                return true;
            }
        },
        {
            type: 'checkbox',
            name: 'options',
            message: 'Choose from the options below',
            choices: [
                'Typescript',
                'Logger',
                'Helmet',
                'Cors',
                'Body parser',
                'JSON payload (express.json())'
            ]
        }
    ]);
    const extension = options.includes('Typescript') ? 'ts' : 'js';
    folder = trimChar(folder.replace('\\', '/').trim(), '/');
    let path = '';
    if(fs.existsSync(folder.split('/')[0])) fs.rmdirSync(folder.split('/')[0], { recursive: true });
    for(var i of folder.split('/')) {
        path += i + '/';
        fs.mkdirSync(path);
    };
    extension === 'ts' ? cmd.run(`npm install -g typescript && cd ${folder} && tsc --init`) : '';
    let list = [];
    options.forEach(option => options_code[option] ? list.push(options_code[option]) : '');
    const packages = {
        'ts': ['express @types/express'],
        'js': ['express']
    };
    list.forEach(item => item[0] ? packages[extension].push(item[0][extension]) : '');
    if(options.includes('Logger')) {
        const { logger } = await inquirer.prompt([
            {
                type: 'list',
                name: 'logger',
                message: 'Pick your logger',
                choices: [
                    'volleyball',
                    'morgan'
                ]
            }
        ]);
        packages[extension].push(options_code[logger][0][extension]);
        list.push(options_code[logger]);
    };
    if(options.includes('Cors')) {
        const { origin } = await inquirer.prompt([
            {
                type: 'input',
                name: 'origin',
                message: 'What is the origin for cors',
                default: '*'
            }
        ]);
        list = list.map(item => [item[0], item[1], item[2].replace('|origin|', origin)]);
    };
    let { location } = await inquirer.prompt([
        {
            type: 'list',
            name: 'location',
            message: 'Where do you want your routes to be?',
            choices: [
                'Seperate file',
                'In server file'
            ]
        }
    ]);
    location = location.includes('server');
    if(!location) {
        fs.mkdirSync(`${folder}/routes`);
        if(extension === 'ts') {
            fs.writeFile(`${folder}/routes/index.ts`, typescript_router, () => '');
        } else {
            fs.writeFile(`${folder}/routes/index.js`, javascript_router, () => '');
        };
    }
    let server = options.includes('Typescript') ? typescript_app : javascript_app;
    let gets = [];
    let uses = [];
    list.forEach(item => {
        item[1] ? gets.push(item[1][extension]) : '';
        uses.push(item[2]);
    });
    gets = gets.join('\n');
    server = server.replace('|packages|', gets);
    uses = uses.join('\n');
    server = server.replace('|middlewares|', uses);
    const servers_json = server.split('\n');
    let final;
    servers_json.forEach(line => {
        if((line.includes('|router|') && !location) || (line.includes('|import_router|') && location)) {
            const index = servers_json.findIndex(li => li === line);
            servers_json.splice(index, 1);
        };
    });
    final = servers_json.join('\n');
    final = final.replaceAll('|router|', '').replaceAll('|import_router|', '');
    fs.writeFile(`${folder}/server.js`, '', () => '');
    console.log('Installing dependencies...');
    cmd.run(`cd ${folder} && npm init -y && npm install ${packages[extension].join(' ')}`, () => {
        console.log('Installed dependencies:');
        extension === 'ts' ? console.log('+ tsc') : '';
        for(let package of packages[extension]) {
            console.log('+', package);
        };
        extension === 'ts' ? console.log('\nCompile your typescript code with tsc --watch') : '';
        console.log('Run the program with npm start');
    });
    fs.writeFile(`${folder}/server.${extension}`, final, () => '');
};

prompt();