import React from 'react';
import LanguagePage from '@site/src/components/playground/LanguagePage';
import FORTH from '@site/src/playground/forth';

export default function ForthPlaygroundPage() {
  return <LanguagePage lang={FORTH} />;
}
