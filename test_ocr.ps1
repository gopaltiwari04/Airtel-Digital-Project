param([string]$ImagePath)
Add-Type -AssemblyName System.Drawing
[Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null

$file = [Windows.Storage.StorageFile]::GetFileFromPathAsync($ImagePath).GetAwaiter().GetResult()
$stream = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read).GetAwaiter().GetResult()
$decoder = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream).GetAwaiter().GetResult()
$bitmap = $decoder.GetSoftwareBitmapAsync().GetAwaiter().GetResult()

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('en-US'))
$ocr = $engine.RecognizeAsync($bitmap).GetAwaiter().GetResult()
$ocr.Text
