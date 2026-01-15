; Eclosion Custom NSIS Script
; Uninstaller customization to prompt for user data deletion

; ============================================================================
; UNINSTALLER CUSTOMIZATIONS
; ============================================================================

!macro customUnInstall
  ; Ask user if they want to delete app data
  ; Note: ${PRODUCT_NAME} is set by electron-builder (e.g., "Eclosion" or "Eclosion Beta")
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to delete all ${PRODUCT_NAME} app data?$\n$\nThis includes your saved credentials, settings, and logs.$\n$\nChoose 'No' to keep your data for future reinstallation." IDYES deleteData IDNO skipDelete

  deleteData:
    ; Delete app data directory (uses product name for correct folder)
    RMDir /r "$APPDATA\${PRODUCT_NAME}"

    ; Also delete from LocalAppData if present
    RMDir /r "$LOCALAPPDATA\${PRODUCT_NAME}"

    ; Delete legacy electron-store config file (old versions used this path)
    Delete "$APPDATA\eclosion-desktop\config.json"
    RMDir "$APPDATA\eclosion-desktop"

    Goto done

  skipDelete:
    ; User chose to keep data

  done:
!macroend
