$cssContent = [System.IO.File]::ReadAllText("css/index.css")

# Simple CSS minifier regex replacements
$minified = $cssContent

# 1. Remove comments
$minified = [System.Text.RegularExpressions.Regex]::Replace($minified, "/\*[\s\S]*?\*/", "")

# 2. Remove spaces around delimiters: { } : ; ,
$minified = [System.Text.RegularExpressions.Regex]::Replace($minified, "\s*([{}|:;,])\s*", '$1')

# 3. Collapse multiple whitespaces
$minified = [System.Text.RegularExpressions.Regex]::Replace($minified, "\s+", " ")

# 4. Trim ends
$minified = $minified.Trim()

[System.IO.File]::WriteAllText("css/index.min.css", $minified)
Write-Host "CSS minified successfully at css/index.min.css"
