/**
 * Notes Tool Settings Header
 *
 * Header section for the Monthly Notes feature within Tool Settings.
 * Displays the tool name and links to the notes page.
 */

import { useNavigate } from 'react-router-dom';
import { NotesIcon } from '../wizards/SetupWizardIcons';
import { useDemo } from '../../context/DemoContext';
import { ToolSettingsHeader } from './ToolSettingsHeader';

export function NotesToolSettings() {
  const navigate = useNavigate();
  const isDemo = useDemo();

  return (
    <ToolSettingsHeader
      icon={<NotesIcon size={20} />}
      title="Monthly Notes"
      description="Add notes to categories and months"
      isActive={true}
      onNavigate={() => navigate(isDemo ? '/demo/notes' : '/notes')}
    />
  );
}
