import React from 'react';
import LanguagePage from '@site/src/components/playground/LanguagePage';
import LISP from '@site/src/playground/lisp';

export default function LispPlaygroundPage() {
  return <LanguagePage lang={LISP} />;
}
