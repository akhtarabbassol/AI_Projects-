import { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  X,
} from "lucide-react";

import {
  uploadDocument,
} from "../api/documents";

import {
  getApiErrorMessage,
} from "../api/client";


const MAX_FILE_SIZE =
  50 * 1024 * 1024;


const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".txt",
  ".csv",
];


export default function UploadModal({
  open,
  onClose,
  onUploaded,

  departments = [],

  departmentLoading = false,

  departmentError = "",

  onRetryDepartments,
}) {
  const fileInputRef =
    useRef(null);


  const [departmentId, setDepartmentId] =
    useState("");

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [dragging, setDragging] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");


  /*
   * Reset modal whenever it closes.
   */

  useEffect(() => {
    if (!open) {
      setDepartmentId("");
      setSelectedFile(null);
      setDragging(false);
      setUploading(false);
      setError("");
    }
  }, [open]);


  if (!open) {
    return null;
  }


  /*
   * ========================================
   * FILE VALIDATION
   * ========================================
   */

  const validateFile = (file) => {
    if (!file) {
      return "Please select a file.";
    }


    if (!(file instanceof File)) {
      return "Invalid file selected.";
    }


    const filename =
      file.name || "";


    const extension =
      filename
        .slice(
          filename.lastIndexOf(".")
        )
        .toLowerCase();


    if (
      !ALLOWED_EXTENSIONS.includes(
        extension
      )
    ) {
      return (
        "Unsupported file type. " +
        "Use PDF, DOCX, TXT, or CSV."
      );
    }


    if (
      file.size > MAX_FILE_SIZE
    ) {
      return (
        "File size exceeds the " +
        "50MB limit."
      );
    }


    return "";
  };


  /*
   * ========================================
   * SELECT FILE
   * ========================================
   */

  const handleFileSelect = (file) => {
    setError("");

    const validationError =
      validateFile(file);

    if (validationError) {
      setSelectedFile(null);
      setError(validationError);
      return;
    }


    /*
     * IMPORTANT:
     * Store the actual File object.
     *
     * DO NOT store:
     * file.name
     *
     * DO NOT store:
     * { name: file.name }
     */

    setSelectedFile(file);
  };


  /*
   * ========================================
   * INPUT CHANGE
   * ========================================
   */

  const handleInputChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (file) {
      handleFileSelect(file);
    }
  };


  /*
   * ========================================
   * DRAG & DROP
   * ========================================
   */

  const handleDrop = (event) => {
    event.preventDefault();

    setDragging(false);

    const file =
      event.dataTransfer.files?.[0];

    if (file) {
      handleFileSelect(file);
    }
  };


  /*
   * ========================================
   * UPLOAD
   * ========================================
   */

  const handleUpload = async () => {
    setError("");


    /*
     * Department validation
     */

    if (!departmentId) {
      setError(
        "Please select a department."
      );
      return;
    }


    const numericDepartmentId =
      Number(departmentId);


    if (
      !Number.isInteger(
        numericDepartmentId
      ) ||
      numericDepartmentId <= 0
    ) {
      setError(
        "Please select a valid department."
      );
      return;
    }


    /*
     * File validation
     */

    if (!selectedFile) {
      setError(
        "Please select a file."
      );
      return;
    }


    if (
      !(selectedFile instanceof File)
    ) {
      setError(
        "Invalid file selected."
      );
      return;
    }


    try {
      setUploading(true);


      /*
       * DEBUG
       *
       * These should print:
       *
       * departmentId: 1
       * selectedFile: File
       * selectedFile.name: abc.pdf
       */

      console.log(
        "Upload department ID:",
        numericDepartmentId
      );

      console.log(
        "Upload file:",
        selectedFile
      );

      console.log(
        "Upload file name:",
        selectedFile.name
      );

      console.log(
        "Is actual File:",
        selectedFile instanceof File
      );


      /*
       * Send the ACTUAL File object.
       */

      await uploadDocument(
        selectedFile,
        numericDepartmentId
      );


      /*
       * Successful upload
       */

      setDepartmentId("");

      setSelectedFile(null);

      setError("");

      if (onUploaded) {
        await onUploaded();
      }

    } catch (err) {
      console.error(
        "Document upload error:",
        err
      );

      setError(
        getApiErrorMessage(
          err,
          "Document upload failed."
        )
      );

    } finally {
      setUploading(false);
    }
  };


  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >

      <div className="modal-content">

        {/* =================================
            HEADER
        ================================== */}

        <div className="modal-header">

          <div>
            <h2>
              Upload Knowledge
            </h2>

            <p className="muted">
              Upload a document to your
              company knowledge base.
            </p>
          </div>


          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            disabled={uploading}
          >
            <X size={22} />
          </button>

        </div>


        {/* =================================
            DEPARTMENT
        ================================== */}

        <div
          className="form-group"
          style={{
            marginTop: "1rem",
          }}
        >

          <label>
            Team / Department
          </label>


          <select
            value={departmentId}
            onChange={(event) => {
              setDepartmentId(
                event.target.value
              );

              setError("");
            }}
            disabled={
              uploading ||
              departmentLoading
            }
          >

            <option value="">
              {departmentLoading
                ? "Loading departments..."
                : departments.length === 0
                  ? "No departments available"
                  : "Select department"}
            </option>


            {departments.map(
              (department) => (
                <option
                  key={department.id}
                  value={department.id}
                >
                  {department.name}
                </option>
              )
            )}

          </select>


          <small className="muted">
            This document will be visible
            only to users in the selected
            department.
          </small>

        </div>


        {/* =================================
            DEPARTMENT ERROR
        ================================== */}

        {departmentError && (

          <div
            className="form-error"
            style={{
              marginTop: "0.75rem",
            }}
          >
            {departmentError}

            {onRetryDepartments && (
              <button
                type="button"
                className="btn-ghost-sm"
                style={{
                  marginLeft: "0.75rem",
                }}
                onClick={
                  onRetryDepartments
                }
              >
                Retry
              </button>
            )}

          </div>

        )}


        {/* =================================
            DROPZONE
        ================================== */}

        <div
          className="upload-dropzone"
          style={{
            borderColor: dragging
              ? "var(--primary)"
              : undefined,

            background: dragging
              ? "rgba(99,102,241,.08)"
              : undefined,
          }}

          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}

          onDragLeave={() => {
            setDragging(false);
          }}

          onDrop={handleDrop}

          onClick={() => {
            if (!uploading) {
              fileInputRef.current?.click();
            }
          }}
        >

          <UploadCloud
            size={42}
          />

          <p>
            Drag & drop files here or{" "}
            <span>
              browse
            </span>
          </p>

          <p className="small">
            Supports PDF, DOCX, TXT, CSV.
            Max 50MB per file.
          </p>


          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept=".pdf,.docx,.txt,.csv"
            onChange={
              handleInputChange
            }
          />


          {/* Selected file */}

          {selectedFile && (

            <div className="selected-file">

              {selectedFile.name}

              {" · "}

              {(
                selectedFile.size /
                1024 /
                1024
              ).toFixed(2)}

              {" MB"}

            </div>

          )}

        </div>


        {/* =================================
            ERROR
        ================================== */}

        {error && (

          <div
            className="form-error"
            style={{
              marginTop: "0.75rem",
            }}
          >
            {error}
          </div>

        )}


        {/* =================================
            FOOTER
        ================================== */}

        <div className="modal-footer">

          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </button>


          <button
            type="button"
            className="btn-primary"
            onClick={handleUpload}
            disabled={
              uploading ||
              departmentLoading ||
              !departmentId ||
              !selectedFile
            }
          >

            {uploading
              ? "Processing..."
              : "Start Ingestion"}

          </button>

        </div>

      </div>

    </div>
  );
}