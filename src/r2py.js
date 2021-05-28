const fs = require('fs');

const convert = (packageName, RdFiles, description = null) => {
    const escapeRegExp = (string) => { // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }
    const trimByChar = (string, character) => {
        const trimmed = string.trim()
        const arr = Array.from(trimmed);
        let start = 0, end = arr.length;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] !== character) {
                start = i;
                break;
            }
        }
        for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i] !== character) {
                end = i;
                break;
            }
        }
        return (trimmed === character) ? '' : trimmed.substring(start, end + 1)
    }
    const special_defaults = (value) => {
        switch (value) {
            case 'NA':
            case '':
                return "r('NA')"
            case 'NULL':
                return "r('NULL')"
            case 'FALSE':
            case 'F':
                return "False"
            case 'TRUE':
            case 'T':
                return "True"
            default:
                if (!isNaN(value)) {
                    return value
                }
                if (/^(\"|')[A-Za-z]+(\"|')$/.test(value)) { // quoted string
                    return value
                }
                return [value] // return as singleton array to mark for special processing
        }
    }
    const parse_args = (usage, arg_names, method_name) => {
        if (!arg_names) {
            return {};
        }
        const args = {};
        const arg_list = trimByChar(usage.replace(`${method_name}(`), ')');

        for (let i = 0; i < arg_names.length; i++) {
            if (arg_names[i] !== '...') {
                const def = (i < arg_names.length - 1) ? new RegExp(`${escapeRegExp(arg_names[i])}(.+?)${escapeRegExp(arg_names[i + 1])}`, 'gms').exec(arg_list)[1] : arg_list.split(arg_names[i], 2)[1];
                args[arg_names[i]] = special_defaults(trimByChar(trimByChar(def, '='), ','));
            }

        }
        return args
    }

    const methods = [];
    for (const RdFile in RdFiles) {
        const f = RdFiles[RdFile];
        const contents = fs.readFileSync(f, 'utf8');
        // match \usage{ then everything until } https://stackoverflow.com/a/7124976/2624391
        const re = /\\usage\s*\{(.+?(?=\}))\}/gs;
        const usage = re.exec(contents)[1];

        const tmp = contents.match(/\\item\{.+?(?=\})/gs);
        let arg_names = undefined;
        if (tmp) {
            arg_names = tmp.map(x => x.replace("\\item{", ''));   
        }
        const method_name = contents.match(/\\name\{.+?(?=\})/gs).map(x => x.replace("\\name{", ''))[0];

        const args = parse_args(usage, arg_names, method_name);

        const buffer1 = [], buffer2 = [], buffer3 = [];
        for (const arg in args) {
            const def = args[arg];
            const complex_default = (def.constructor === Array);
            buffer1.push(`${arg.replace(/\./g, '_')} = ${(complex_default) ? 'None' : def}`);
            (!complex_default) ?
                buffer2.push(`r.assign('${arg}', ${arg.replace(/\./g, '_')})`)
            :
                buffer3.push(`if ${arg.replace(/\./g, '_')} is None:\n\t\t${arg.replace(/\./g, '_')} = r('${def[0]}')\n\tr.assign('${arg}', ${arg.replace(/\./g, '_')})`)
        }
        const signature = `def ${method_name.replace(/\./g, '_')}(${buffer1.join(', ')}):\n\t`
        const assignments = (buffer2.length > 0) ? buffer2.join("\n\t") : ''
        const validated_assignments = (buffer3.length > 0) ? "\n\t" + buffer3.join("\n\t") : ''
        const ret = (Object.keys(args).length === 0) ? `return r('${method_name}')\n` : `\n\treturn r('${method_name}(${Object.keys(args).map(x => x + '=' + x).join(', ')})')\n`;

        methods.push(signature + assignments + validated_assignments + ret)

    }
    // console.log(methods.join("\n"))
    return "import os\n" +
        "from rpy2.robjects import r, numpy2ri, pandas2ri\n" +
        "from rpy2.robjects.packages import importr\n" +
        "numpy2ri.activate()\n" +
        "pandas2ri.activate()\n" +
        `importr('${packageName}')\n\n` +
        "neurobase = importr('neurobase')\n\n" +
        "def readnii(file):\n" +
        "\treturn neurobase.readnii(file)\n" +
        "def writenii(data, file):\n" +
        "\timport nibabel as nib\n" +
        "\timport numpy as np\n" +
        "\tif type(data) is np.ndarray:\n" +
        "\t\tnew_image = nib.Nifti1Image(data, affine=np.eye(4))\n" +
        "\t\treturn new_image.to_filename(file)\n" +
        "\telse:\n" +
        "\t\treturn neurobase.writenii(data, file)\n\n\n" +
        methods.join("\n")

}

module.exports = convert
