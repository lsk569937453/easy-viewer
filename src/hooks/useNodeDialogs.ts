import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useRef,
  useState,
} from "react";
import type { TreeNode } from "../types/tree";

export interface NodeDialogs {
  deleteModalRef: RefObject<HTMLDialogElement | null>;
  nodeToDelete: TreeNode | null;
  setNodeToDelete: Dispatch<SetStateAction<TreeNode | null>>;
  openDeleteDialog: (node: TreeNode) => void;
  closeDeleteDialog: () => void;

  createCollectionModalRef: RefObject<HTMLDialogElement | null>;
  newCollectionName: string;
  setNewCollectionName: Dispatch<SetStateAction<string>>;
  createCollectionNode: TreeNode | null;
  openCreateCollectionDialog: (node: TreeNode) => void;
  hideCreateCollectionDialog: () => void;
  closeCreateCollectionDialog: () => void;

  createBucketModalRef: RefObject<HTMLDialogElement | null>;
  newBucketName: string;
  setNewBucketName: Dispatch<SetStateAction<string>>;
  createBucketNode: TreeNode | null;
  openCreateBucketDialog: (node: TreeNode) => void;
  hideCreateBucketDialog: () => void;
  closeCreateBucketDialog: () => void;

  renameModalRef: RefObject<HTMLDialogElement | null>;
  nodeToRename: TreeNode | null;
  renameValue: string;
  setRenameValue: Dispatch<SetStateAction<string>>;
  openRenameDialog: (node: TreeNode) => void;
  closeRenameDialog: () => void;

  copyModalRef: RefObject<HTMLDialogElement | null>;
  nodeToCopy: TreeNode | null;
  copyTargetDir: string;
  setCopyTargetDir: Dispatch<SetStateAction<string>>;
  openCopyDialog: (node: TreeNode) => void;
  closeCopyDialog: () => void;
}

/**
 * DatabaseViewer 的 5 个原生 `<dialog>`：refs、目标节点、输入值与开关动作。
 * 每个 `<dialog>` 的 markup 放在 `components/database-viewer/dialogs/`。
 */
export function useNodeDialogs(): NodeDialogs {
  const createCollectionModalRef = useRef<HTMLDialogElement>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [createCollectionNode, setCreateCollectionNode] =
    useState<TreeNode | null>(null);

  const createBucketModalRef = useRef<HTMLDialogElement>(null);
  const [newBucketName, setNewBucketName] = useState("");
  const [createBucketNode, setCreateBucketNode] = useState<TreeNode | null>(
    null,
  );

  const renameModalRef = useRef<HTMLDialogElement>(null);
  const [nodeToRename, setNodeToRename] = useState<TreeNode | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const copyModalRef = useRef<HTMLDialogElement>(null);
  const [nodeToCopy, setNodeToCopy] = useState<TreeNode | null>(null);
  const [copyTargetDir, setCopyTargetDir] = useState("");

  const [nodeToDelete, setNodeToDelete] = useState<TreeNode | null>(null);
  const deleteModalRef = useRef<HTMLDialogElement>(null);

  const openDeleteDialog = (node: TreeNode) => {
    setNodeToDelete(node);
    deleteModalRef.current?.showModal();
  };

  const closeDeleteDialog = () => {
    setNodeToDelete(null);
    deleteModalRef.current?.close();
  };

  const openCreateCollectionDialog = (node: TreeNode) => {
    setNewCollectionName("");
    setCreateCollectionNode(node);
    createCollectionModalRef.current?.showModal();
  };

  const hideCreateCollectionDialog = () => {
    createCollectionModalRef.current?.close();
  };

  const closeCreateCollectionDialog = () => {
    setNewCollectionName("");
    setCreateCollectionNode(null);
    createCollectionModalRef.current?.close();
  };

  const openCreateBucketDialog = (node: TreeNode) => {
    setNewBucketName("");
    setCreateBucketNode(node);
    createBucketModalRef.current?.showModal();
  };

  const hideCreateBucketDialog = () => {
    createBucketModalRef.current?.close();
  };

  const closeCreateBucketDialog = () => {
    setNewBucketName("");
    setCreateBucketNode(null);
    createBucketModalRef.current?.close();
  };

  const openRenameDialog = (node: TreeNode) => {
    setNodeToRename(node);
    setRenameValue(node.name);
    renameModalRef.current?.showModal();
  };

  const closeRenameDialog = () => {
    setNodeToRename(null);
    renameModalRef.current?.close();
  };

  const openCopyDialog = (node: TreeNode) => {
    setNodeToCopy(node);
    // 预填当前所在目录，便于在其基础上修改
    const parentSegments = node.path.slice(1, -1).map((p) => p.config_value);
    setCopyTargetDir(`/${parentSegments.join("/")}`);
    copyModalRef.current?.showModal();
  };

  const closeCopyDialog = () => {
    setNodeToCopy(null);
    copyModalRef.current?.close();
  };

  return {
    deleteModalRef,
    nodeToDelete,
    setNodeToDelete,
    openDeleteDialog,
    closeDeleteDialog,
    createCollectionModalRef,
    newCollectionName,
    setNewCollectionName,
    createCollectionNode,
    openCreateCollectionDialog,
    hideCreateCollectionDialog,
    closeCreateCollectionDialog,
    createBucketModalRef,
    newBucketName,
    setNewBucketName,
    createBucketNode,
    openCreateBucketDialog,
    hideCreateBucketDialog,
    closeCreateBucketDialog,
    renameModalRef,
    nodeToRename,
    renameValue,
    setRenameValue,
    openRenameDialog,
    closeRenameDialog,
    copyModalRef,
    nodeToCopy,
    copyTargetDir,
    setCopyTargetDir,
    openCopyDialog,
    closeCopyDialog,
  };
}
