package main

import (
    "fmt"
    "net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "Hello from Go API!")
}

func main() {
    fmt.Println("🚀 API Server running on http://localhost:3001")
    http.HandleFunc("/", handler)
    http.ListenAndServe(":3001", nil)
}
