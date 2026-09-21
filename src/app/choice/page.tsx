import { JuanChoiceExperience } from '@/components/JuanChoiceExperience';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata('JuanChoice community spotlight', 'Vote for Pangasinan destinations in free community spotlight rounds. Every participant earns equal Civic XP and stamps.', '/choice');
export default function ChoicePage() { return <JuanChoiceExperience />; }
