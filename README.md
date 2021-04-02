# r2py
Wraps R code in python using rpy2.

## Examples
### WhiteStripe
First transpile R to python,
```sh
git clone https://github.com/muschellij2/WhiteStripe.git
Rscript -e 'source("R/transpile.R"); cat(transpile("WhiteStripe", list.files("WhiteStripe/man", full.names = TRUE)))' > whitestripe.py
rm -rf WhiteStripe
```
Then import and use,
```py
import whitestripe as ws
t1 = ws.readnii("T1w.nii.gz")
ind = ws.whitestripe(t1, "T1")

res = ws.whitestripe_norm(t1, ind[0])
ws.writenii(res, "T1w_ws.nii.gz")
```
### RAVEL
```sh
git clone https://github.com/Jfortin1/RAVEL.git
Rscript -e 'source("R/transpile.R"); cat(transpile("RAVEL", list.files("RAVEL/man", full.names = TRUE)))' > ravel.py
rm -rf RAVEL
```
```py
import ravel
import numpy as np
from rpy2.robjects import r
t1 = np.repeat("T1w.nii.gz", 4).tolist()
mask = np.vectorize(lambda x : x > 0)(ravel.readnii(t1[0])).astype(float)
ravel.writenii(mask, "T1w_mask.nii.gz")
mod = r('model.matrix(~c(70,62,43,76)+c("M", "M", "F", "F"))') # todo in python?
ravel.normalizeRAVEL(input_files = t1, brain_mask = "T1w_mask.nii.gz", control_mask = "T1w_mask.nii.gz", k = 1, mod = mod, returnMatrix = True, WhiteStripe = False)
```
### Voxel
```sh
git clone https://github.com/angelgar/voxel.git
Rscript -e 'source("R/transpile.R"); cat(transpile("voxel", list.files("voxel/man", full.names = TRUE)))' > voxel.py
rm -rf voxel
```
```py
import voxel
import numpy as np
import pandas as pd
t1 = voxel.readnii("T1w.nii.gz")
mask = np.vectorize(lambda x : x > 0)(t1).astype(float)
covs = pd.DataFrame(data={
    'x': np.random.normal(25, 1, 2646276),
    'y': np.random.normal(25, 1, 2646276)
})
fm1 = "~ x + s(y)"
voxel.gamNIfTI(image=t1, mask=mask,
              formula=fm1, subjData=covs, ncores = 1, method="fdr")
```