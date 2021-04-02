# devtools::install.packages('Rdpack')

transpile <- function(packageName, RdFiles) {
    # reticulate::use_python("/usr/bin/python3", required = TRUE)
    # ast <- reticulate::import('ast')
    special_defaults <- function(value) {
        if (is.na(value) || value == "NA") {
            # return ("None")
            return ("r('NA')")
        }
        if (value == "NULL") {
            return ("r('NULL')")
        }
        if (value == "FALSE" || value == "F") {
            return ("False")
        }
        if (value == "TRUE" || value == "T") {
            return ("True")
        }
        if (grepl("file.path", value)) {
            return (gsub("file.path", "os.path.join", value))
        }
        if (!is.na(as.numeric(value))) {
            return (value)
        }
        if (grepl("^[A-Za-z\"']+$", value)) {
            return (value)
        }
        return (NA) # seems like a more complex expression, default to None and validate within method
        # return (value)
    }
    methods = c()
    i = 1
    for (RdFile in RdFiles) {
        rd = tools::parse_Rd(RdFile)
        usage = Rdpack::inspect_usage(rd)
        if (length(usage) > 0) { # otherwise we were probably fed an invalid Rd file
            details = attr(usage[[1]], "details")$rdo_usage
            name = details$name
            defaults = details$defaults
            assignments = c()
            validations = c()
            args = c()
            args_w_defaults = c()
            j = k = l = 1
            for (arg in details$argnames) {
                if (arg != '...') {
                    args[l] = arg
                    dot_replaced = gsub("\\.", '_', arg)
                    special_default = special_defaults(defaults[arg])
                    if (is.na(special_default)) {
                        special_default = "None"
                        validation = paste0("\tif ", dot_replaced, " is None:\n\t\t", dot_replaced, " = r('", defaults[arg], "')\n")
                        validations[k] = paste0(validation, "\tr.assign('", arg, "', ", dot_replaced, ")\n")
                        k = k + 1
                    } else {
                        assignments[j] = paste0("r.assign('", arg, "', ", dot_replaced, ")", sep = "")
                        j = j + 1
                    }
                    args_w_defaults[l] = paste(dot_replaced, '=', special_default)
                    l = l + 1
                    
                }
            }
            validations = paste0(validations, collapse = '')
            # args = c(args, validations)
            function_signature = paste0(
                "\ndef ", gsub("\\.", '_', name), '(', paste0(args_w_defaults, collapse = ', '), '):\n'
            , sep = '')
            all_assignments = paste0(paste0("\t", assignments, "\n"), collapse = '', sep = '')
            ret = paste0(paste0("\treturn r('", name, '(', ifelse(length(args) > 0, paste0(paste0(args, '=', args), collapse = ', '), ''), ")')\n"
            , sep = ''))
            # need to take out withs, replace None with r(NULL)
            # with_converter = paste0("\twith conversion.localconverter(default_converter + none_converter):\n\t\tnumpy2ri.activate()\n\t\tpandas2ri.activate()\n")
            methods[[i]] = ifelse(length(args) > 0, paste0(function_signature, all_assignments, validations, ret), paste0(function_signature, ret))
            i = i + 1
        }
    }

    paste("import os",
    # "from rpy2.robjects import r, conversion, default_converter, numpy2ri, pandas2ri",
    "from rpy2.robjects import r, numpy2ri, pandas2ri",
    "from rpy2.robjects.packages import importr",
    "numpy2ri.activate()",
    "pandas2ri.activate()",
    paste0("importr('", packageName, "')"),
    "neurobase = importr('neurobase')\n",
    # "def _none2null(none_obj):",
    # "\treturn r('NULL')",
    # "none_converter = conversion.Converter('None converter')",
    # "none_converter.py2rpy.register(type(None), _none2null)",
    "def readnii(file):",
    "\treturn neurobase.readnii(file)",
    "def writenii(data, file):",
    "\timport nibabel as nib",
    "\timport numpy as np",
    "\tif type(data) is np.ndarray:",
    "\t\tnew_image = nib.Nifti1Image(data, affine=np.eye(4))",
    "\t\treturn new_image.to_filename(file)",
    "\telse:",
    "\t\treturn neurobase.writenii(data, file)\n",
    paste0(methods, collapse = ''), sep = "\n")

}

