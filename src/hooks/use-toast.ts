import * as React from "react"
export function useToast() {
  return {
    toast: (props: any) => {},
    dismiss: (toastId?: string) => {},
    toasts: []
  }
}
