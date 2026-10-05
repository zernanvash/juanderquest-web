import { JuanChoiceExperience } from '@/components/JuanChoiceExperience';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata('JuanChoice Community Spotlight', 'Support destinations in free community spotlight rounds, starting with Pangasinan pilot communities. Participation rewards are equal for every voter.', '/choice');
export default function ChoicePage() { return <JuanChoiceExperience />; }
