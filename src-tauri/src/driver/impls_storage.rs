//! 对象存储类数据源（S3 / OSS、WebDAV）的 `Driver` 实现。

use crate::delegate;
use crate::delegate_app;
use crate::driver::traits::{describe_or_default, BoxFuture, Driver, ProgressFn};
use crate::error::AppResult;
use crate::generated::DatabaseType;
use crate::service::s3_service::S3Config;
use crate::service::webdav_service::WebdavConfig;
use crate::sql_lite::connection::AppState;
use crate::vojo::get_object_info_res::GetObjectInfoRes;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;

impl Driver for S3Config {
    fn db_type(&self) -> DatabaseType {
        DatabaseType::S3
    }

    fn test_connection(&self) -> BoxFuture<'_, AppResult<()>> {
        delegate!(S3Config::test_connection(self))
    }

    fn server_version(&self) -> BoxFuture<'_, AppResult<String>> {
        delegate!(S3Config::get_server_version(self))
    }

    fn list_node_info(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ListNodeInfoResponse>> {
        delegate_app!(app, S3Config::list_node_info(self, req, &app))
    }

    fn get_object_info(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        is_folder: bool,
    ) -> BoxFuture<'_, AppResult<GetObjectInfoRes>> {
        delegate_app!(app, S3Config::get_object_info(self, req, &app, is_folder))
    }

    fn download_file(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        destination: String,
        is_folder: bool,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(
            app,
            S3Config::download_file(self, req, &app, destination, is_folder)
        )
    }

    fn download_bucket(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        destination: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, S3Config::download_bucket(self, req, &app, destination))
    }

    fn upload_file(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        local_file_path: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, S3Config::upload_file(self, req, &app, local_file_path))
    }

    fn upload_folder(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        local_dir: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, S3Config::upload_folder(self, req, &app, local_dir))
    }

    fn upload_file_multipart(
        &self,
        req: ListNodeInfoReq,
        local_file_path: String,
        progress: ProgressFn,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate!(S3Config::upload_file_multipart(
            self,
            req,
            local_file_path,
            move |uploaded, total| progress(uploaded, total)
        ))
    }

    fn create_folder(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        folder_name: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, S3Config::create_folder(self, req, &app, folder_name))
    }

    fn create_bucket(&self, bucket_name: String) -> BoxFuture<'_, AppResult<()>> {
        delegate!(S3Config::create_bucket(self, bucket_name))
    }

    fn delete_bucket(&self, req: ListNodeInfoReq, app: &AppState) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, S3Config::delete_bucket(self, req, &app))
    }
}

impl Driver for WebdavConfig {
    fn db_type(&self) -> DatabaseType {
        DatabaseType::Webdav
    }

    fn description(&self) -> String {
        describe_or_default(
            WebdavConfig::get_description(self),
            DatabaseType::Webdav.label(),
        )
    }

    fn test_connection(&self) -> BoxFuture<'_, AppResult<()>> {
        delegate!(WebdavConfig::test_connection(self))
    }

    fn server_version(&self) -> BoxFuture<'_, AppResult<String>> {
        delegate!(WebdavConfig::get_server_version(self))
    }

    fn list_node_info(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ListNodeInfoResponse>> {
        delegate_app!(app, WebdavConfig::list_node_info(self, req, &app))
    }

    fn get_object_info(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        is_folder: bool,
    ) -> BoxFuture<'_, AppResult<GetObjectInfoRes>> {
        delegate_app!(
            app,
            WebdavConfig::get_object_info(self, req, &app, is_folder)
        )
    }

    fn download_file(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        destination: String,
        is_folder: bool,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(
            app,
            WebdavConfig::download_file(self, req, &app, destination, is_folder)
        )
    }

    fn upload_file(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        local_file_path: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(
            app,
            WebdavConfig::upload_file(self, req, &app, local_file_path)
        )
    }

    fn upload_file_multipart(
        &self,
        req: ListNodeInfoReq,
        local_file_path: String,
        progress: ProgressFn,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate!(WebdavConfig::upload_file_multipart(
            self,
            req,
            local_file_path,
            move |uploaded, total| progress(uploaded, total)
        ))
    }

    fn create_folder(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        folder_name: String,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(
            app,
            WebdavConfig::create_folder(self, req, &app, folder_name)
        )
    }

    fn delete_bucket(&self, req: ListNodeInfoReq, app: &AppState) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(app, WebdavConfig::delete_object(self, req, &app))
    }

    fn rename_object(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        new_name: String,
        is_folder: bool,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(
            app,
            WebdavConfig::rename_object(self, req, &app, new_name, is_folder)
        )
    }

    fn copy_object(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
        target_dir: String,
        is_folder: bool,
    ) -> BoxFuture<'_, AppResult<()>> {
        delegate_app!(
            app,
            WebdavConfig::copy_object(self, req, &app, target_dir, is_folder)
        )
    }
}
