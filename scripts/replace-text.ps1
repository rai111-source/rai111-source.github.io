Get-ChildItem -Filter *.html | ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName)
    $updated = $content.Replace("LittleLayers.Co", "LittleLayers")
    $updated = $updated.Replace("Little<em>Layers</em>.Co", "Little<em>Layers</em>")
    if ($content -ne $updated) {
        [System.IO.File]::WriteAllText($_.FullName, $updated)
        Write-Host "Updated: $($_.Name)"
    }
}
