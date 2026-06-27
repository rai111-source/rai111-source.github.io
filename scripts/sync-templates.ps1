$htmlFiles = @(
  "admin.html",
  "cart.html",
  "checkout.html",
  "custom-gifts.html",
  "gallery.html",
  "login.html",
  "logout.html",
  "product.html",
  "products.html",
  "profile.html",
  "prototyping.html",
  "track.html"
)

$indexContent = [System.IO.File]::ReadAllText("index.html")

# Helper to extract tags
function Extract-Tag($html, $startTag, $endTag) {
    $startIdx = $html.IndexOf($startTag)
    if ($startIdx -eq -1) { return $null }
    $endIdx = $html.IndexOf($endTag, $startIdx)
    if ($endIdx -eq -1) { return $null }
    return $html.Substring($startIdx, $endIdx - $startIdx + $endTag.Length)
}

$topbarSource = Extract-Tag $indexContent '<div class="topbar">' '</div>'
$navSource = Extract-Tag $indexContent '<nav>' '</nav>'
$mobnavSource = Extract-Tag $indexContent '<div class="mobnav"' '</div>'
$footerSource = Extract-Tag $indexContent '<footer>' '</footer>'
$notifSource = Extract-Tag $indexContent '<div class="notif"' '</div>'

if (-not $topbarSource -or -not $navSource -or -not $mobnavSource -or -not $footerSource) {
    Write-Error "Failed to extract templates from index.html!"
    exit 1
}

Write-Host "Successfully extracted templates from index.html"

function Adapt-Links($blockText) {
    # Replace links for inner folder files to point to index.html sections
    $adapted = $blockText -replace 'href="#home"', 'href="index.html#home"'
    $adapted = $adapted -replace 'href="#how"', 'href="index.html#how"'
    $adapted = $adapted -replace 'href="#services"', 'href="index.html#services"'
    $adapted = $adapted -replace 'href="#contact"', 'href="index.html#contact"'
    $adapted = $adapted -replace 'href="#about"', 'href="index.html#about"'
    return $adapted
}

foreach ($file in $htmlFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "Skipping missing file: $file"
        continue
    }
    
    $content = [System.IO.File]::ReadAllText($file)
    $originalContent = $content
    
    # Replace Topbar
    $targetTopbar = Extract-Tag $content '<div class="topbar">' '</div>'
    if ($targetTopbar) {
        $content = $content.Replace($targetTopbar, (Adapt-Links $topbarSource))
    }
    
    # Replace Nav
    $targetNav = Extract-Tag $content '<nav>' '</nav>'
    if ($targetNav) {
        $navBlock = Adapt-Links $navSource
        if ($file -ne "index.html" -and $targetNav.Contains('href="cart.html"')) {
            $navBlock = $navBlock -replace 'onclick="toggleCart\(\)"', 'href="cart.html" style="text-decoration: none;"'
        }
        $content = $content.Replace($targetNav, $navBlock)
    }
    
    # Replace Mobnav
    $targetMobnav = Extract-Tag $content '<div class="mobnav"' '</div>'
    if ($targetMobnav) {
        $content = $content.Replace($targetMobnav, (Adapt-Links $mobnavSource))
    }
    
    # Replace Footer
    $targetFooter = Extract-Tag $content '<footer>' '</footer>'
    if ($targetFooter) {
        $content = $content.Replace($targetFooter, (Adapt-Links $footerSource))
    }
    
    # Replace Notification
    $targetNotif = Extract-Tag $content '<div class="notif"' '</div>'
    if ($targetNotif) {
        $content = $content.Replace($targetNotif, $notifSource)
    }
    
    if ($content -ne $originalContent) {
        [System.IO.File]::WriteAllText($file, $content)
        Write-Host "OK: Synchronized components in: $file"
    } else {
        Write-Host "Up to date: $file"
    }
}

Write-Host "Template synchronization complete."
