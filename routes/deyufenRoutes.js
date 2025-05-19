// 删除活动
router.delete('/activity/:id', deyufenController.checkActivityAuth, deyufenController.deleteActivity);

// 删除活动历史记录
router.get('/activity/delete-history', deyufenController.checkSuperAdminAuth, deyufenController.getDeleteHistory);

// 删除指定的删除历史记录
router.delete('/activity/delete-history/:id', deyufenController.checkSuperAdminAuth, deyufenController.deleteHistoryRecord);

// 清空所有删除历史记录
router.delete('/activity/delete-history/all', deyufenController.checkSuperAdminAuth, deyufenController.clearDeleteHistory);

// 新增POST方法清空所有删除历史记录
router.post('/activity/delete-history/clear-all', deyufenController.checkSuperAdminAuth, deyufenController.clearDeleteHistory); 