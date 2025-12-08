"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Upload } from "lucide-react"

export interface UploadButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onUpload?: (files: FileList | null) => void
  accept?: string
  multiple?: boolean
  loading?: boolean
  endpoint?: string
  onClientUploadComplete?: (res: { url: string }[]) => void
  onUploadError?: (error: Error) => void
}

const UploadButton = React.forwardRef<HTMLButtonElement, UploadButtonProps>(
  ({ className, onUpload, accept, multiple = false, loading = false, children, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)

    const handleClick = () => {
      inputRef.current?.click()
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onUpload?.(event.target.files)
      // Reset the input value so the same file can be selected again
      event.target.value = ""
    }

    return (
      <div className="relative">
        <input
          type="file"
          ref={inputRef}
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
        />
        <Button
          ref={ref}
          className={cn("gap-2", className)}
          onClick={handleClick}
          disabled={loading}
          {...props}
        >
          <Upload className="h-4 w-4" />
          {children || "Upload"}
        </Button>
      </div>
    )
  }
)

UploadButton.displayName = "UploadButton"

export { UploadButton } 