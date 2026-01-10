import * as React from 'react';
import TextareaAutosize, { TextareaAutosizeProps } from 'react-textarea-autosize';

import { cn } from '@/lib/utils';

const textareaVariants = 'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          textareaVariants,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, TextareaAutosizeProps>(
  ({ className, ...props }, ref) => {
    return (
      <TextareaAutosize
        className={cn(
          textareaVariants,
          'resize-none',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
AutoResizeTextarea.displayName = 'AutoResizeTextarea';

export { Textarea, AutoResizeTextarea };
