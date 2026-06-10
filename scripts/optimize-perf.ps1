$rootDir = Resolve-Path "$PSScriptRoot\.."
$htmlFiles = Get-ChildItem -Path $rootDir -Filter *.html

# 1. Minify CSS
$cssPath = Join-Path $rootDir "css\index.css"
$minCssPath = Join-Path $rootDir "css\index.min.css"
if (Test-Path $cssPath) {
    $cssContent = [System.IO.File]::ReadAllText($cssPath)
    $minified = $cssContent
    # Remove comments
    $minified = $minified -replace '/\*[\s\S]*?\*/', ''
    # Remove whitespace around delimiters
    $minified = $minified -replace '\s*([{}|:;,])\s*', '$1'
    # Collapse multiple spaces
    $minified = $minified -replace '\s+', ' '
    $minified = $minified.Trim()
    [System.IO.File]::WriteAllText($minCssPath, $minified)
    Write-Host "CSS minified successfully at css/index.min.css"
}

# 2. Optimize Script and Style tags in HTML files
$replacements = @{
    '<script src="https://unpkg.com/@phosphor-icons/web"></script>' = '<script src="https://unpkg.com/@phosphor-icons/web" defer></script>'
    '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>' = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>'
    '<script src="js/env.js"></script>' = '<script src="js/env.js" defer></script>'
    '<script src="js/supabase.js"></script>' = '<script src="js/supabase.js" defer></script>'
    '<script src="js/auth.js"></script>' = '<script src="js/auth.js" defer></script>'
    '<script src="js/index.js"></script>' = '<script src="js/index.js" defer></script>'
    '<script src="js/scripts.js"></script>' = '<script src="js/scripts.js" defer></script>'
    '<script src="js/product.js"></script>' = '<script src="js/product.js" defer></script>'
    '<script src="js/admin.js"></script>' = '<script src="js/admin.js" defer></script>'
    '<script src="js/track.js"></script>' = '<script src="js/track.js" defer></script>'
    '<script src="js/gallery.js"></script>' = '<script src="js/gallery.js" defer></script>'
    '<link rel="stylesheet" href="css/index.css">' = '<link rel="stylesheet" href="css/index.min.css">'
}

foreach ($file in $htmlFiles) {
    $filePath = $file.FullName
    $content = [System.IO.File]::ReadAllText($filePath)
    $originalContent = $content

    foreach ($key in $replacements.Keys) {
        if ($content.Contains($key)) {
            $content = $content.Replace($key, $replacements[$key])
        }
    }

    if ($content -ne $originalContent) {
        [System.IO.File]::WriteAllText($filePath, $content)
        Write-Host "Optimized tags in: $($file.Name)"
    }
}

Write-Host "Tag and asset optimizations complete."
